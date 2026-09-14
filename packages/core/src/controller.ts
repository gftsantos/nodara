import type { BaseOptions, NodaraController, NodaraPlugin, Unsubscribe } from "./types";
import { empty, NodaraError } from "./utils";
import { validateBaseOptions } from "./options";

type Listener = (payload: unknown) => void;
const styleKeys = (style: CSSStyleDeclaration) => Array.from({ length: style.length }, (_, index) => style.item(index));

export interface RenderContext<TData, TOptions> {
  container: HTMLElement;
  data: TData;
  options: TOptions;
  emit: (event: string, payload: unknown) => void;
  commit: (data: TData, event?: string, payload?: unknown) => void;
}

export type Renderer<TData, TOptions> = (
  context: RenderContext<TData, TOptions>,
) => void | (() => void);

export interface ControllerConfig<TData, TOptions> {
  normalize?: (data: TData) => TData;
  validate?: (data: TData, options: TOptions) => void;
  getPlugins?: (options: TOptions) => NodaraPlugin<TData, TOptions>[];
}

export function createController<TData, TOptions extends BaseOptions>(
  container: HTMLElement,
  initialData: TData,
  initialOptions: TOptions,
  renderer: Renderer<TData, TOptions>,
  config: ControllerConfig<TData, TOptions> = {},
): NodaraController<TData, TOptions> {
  const listeners = new Map<string, Set<Listener>>();
  const originalAttributes = new Map(["role", "aria-label", "class"].map(name => [name, container.getAttribute(name)]));
  const originalTokens = new Map(styleKeys(container.style).filter(name => name.startsWith("--nd-")).map(name => [name, { value: container.style.getPropertyValue(name), priority: container.style.getPropertyPriority(name) }]));
  const originalData = new Map([...container.attributes].filter(attribute => attribute.name.startsWith("data-nd-")).map(attribute => [attribute.name, attribute.value]));
  const normalize = config.normalize ?? ((data: TData) => data);
  const pluginsFor = config.getPlugins ?? ((options: TOptions) => (options.plugins ?? []) as NodaraPlugin<TData, TOptions>[]);
  let currentData = initialData;
  let currentOptions = initialOptions;
  let cleanup: void | (() => void);
  let destroyed = false;
  let rendering = false;
  let pendingRender = false;
  let hasRendered = false;
  let guardDepth = 0;
  let notifyingError = false;
  let changingOptions = false;
  const reportedErrors = new Set<Error>();
  let activePlugins = new Set<NodaraPlugin<TData, TOptions>>();

  const report = (cause: unknown): never => {
    const error = cause instanceof Error ? cause : new Error(String(cause));
    if (reportedErrors.has(error) || notifyingError) throw error;
    reportedErrors.add(error);
    notifyingError = true;
    // Consumer error handlers must not mask the original failure or each other.
    try { currentOptions.onError?.(error); } catch { /* Report the original error below. */ }
    for (const listener of [...(listeners.get("error") ?? [])]) {
      if (destroyed) break;
      try { listener(error); } catch { /* Continue notifying the remaining subscribers. */ }
    }
    notifyingError = false;
    throw error;
  };
  const guard = <T>(operation: () => T): T => {
    guardDepth += 1;
    try { if (guardDepth > 50) throw new NodaraError("ND_REENTRANT_MUTATION", "Synchronous component mutations exceeded 50 nested calls."); return operation(); } catch (cause) { return report(cause); }
    finally { guardDepth -= 1; if (!guardDepth) reportedErrors.clear(); }
  };

  const emit = (event: string, payload: unknown) => {
    if (destroyed) return;
    for (const listener of [...(listeners.get(event) ?? [])]) { if (destroyed) break; listener(payload); }
  };

  const pluginContext = () => ({ element: container, data: currentData, options: currentOptions });

  const renderUnsafe = () => {
    if (destroyed) return;
    if (rendering) { pendingRender = true; return; }
    rendering = true;
    let passes = 0;
    try {
      do {
      if (++passes > 50) throw new NodaraError("ND_REENTRANT_RENDER", "Render observers continually changed the component; limit of 50 synchronous passes exceeded.");
      pendingRender = false;
      const focused = container.contains(document.activeElement) ? document.activeElement as HTMLElement : undefined;
      const focusKey = focused?.getAttribute("data-nd-focus");
      const focusIndex = focused ? [...container.querySelectorAll("button, [tabindex]")].indexOf(focused) : -1;
      const previousCleanup = cleanup; cleanup = undefined; previousCleanup?.();
      if (destroyed) return;
      const context = pluginContext();
      for (const plugin of activePlugins) { plugin.beforeRender?.(context); if (destroyed) return; }
      hasRendered = true;
      cleanup = renderer({ container, data: currentData, options: currentOptions, emit, commit });
      if (destroyed) { const lateCleanup = cleanup; cleanup = undefined; lateCleanup?.(); empty(container); return; }
      for (const name of originalAttributes.get("class")?.split(/\s+/).filter(Boolean) ?? []) container.classList.add(name);
      if (focused && !focused.isConnected) {
        const controls = [...container.querySelectorAll<HTMLElement>("button, [tabindex]")];
        const replacement = focusKey ? controls.find(control => control.getAttribute("data-nd-focus") === focusKey) : controls[focusIndex];
        replacement?.focus({ preventScroll: true });
      }
      for (const plugin of activePlugins) { plugin.afterRender?.(pluginContext()); if (destroyed) return; }
      emit("render", { data: currentData, options: currentOptions });
      } while (pendingRender && !destroyed);
    } finally {
      rendering = false;
    }
  };
  const render = () => guard(renderUnsafe);

  const commit = (data: TData, event?: string, payload?: unknown) => {
    if (destroyed) return;
    guard(() => {
      if (changingOptions) throw new NodaraError("ND_REENTRANT_OPTIONS", "Data cannot be changed while an atomic options/state change is dispatching. Schedule the next update after this transaction.");
      const normalized = normalize(data);
      config.validate?.(normalized, currentOptions);
      currentData = normalized;
      for (const plugin of [...activePlugins]) { if (destroyed) break; plugin.onDataChange?.(pluginContext()); }
      renderUnsafe();
      emit("data:change", currentData);
      if (event) emit(event, payload ?? currentData);
    });
  };

  const resizeObserver = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(() => render());
  const media = typeof matchMedia === "undefined" ? undefined : matchMedia("(prefers-color-scheme: dark)");
  const onThemeChange = () => { if (!currentOptions.theme || currentOptions.theme === "system") render(); };
  const release = () => {
    if (destroyed) return;
    destroyed = true;
    const failures: unknown[] = [];
    const attempt = (operation: () => void) => { try { operation(); } catch (cause) { failures.push(cause); } };
    const lastCleanup = cleanup; cleanup = undefined;
    attempt(() => lastCleanup?.());
    attempt(() => resizeObserver?.disconnect());
    attempt(() => media?.removeEventListener?.("change", onThemeChange));
    const plugins = [...activePlugins]; activePlugins.clear();
    plugins.forEach(plugin => attempt(() => plugin.onDestroy?.(pluginContext())));
    if (hasRendered) empty(container);
    for (const [name, value] of originalAttributes) {
      if (value === null) container.removeAttribute(name); else container.setAttribute(name, value);
    }
    for (const name of styleKeys(container.style)) if (name.startsWith("--nd-")) container.style.removeProperty(name);
    originalTokens.forEach(({ value, priority }, name) => container.style.setProperty(name, value, priority));
    for (const attribute of [...container.attributes]) if (attribute.name.startsWith("data-nd-")) container.removeAttribute(attribute.name);
    originalData.forEach((value, name) => container.setAttribute(name, value));
    if (failures.length) { try { report(failures[0]); } finally { listeners.clear(); } }
    listeners.clear();
  };

  const changeState = (data: TData, options: Partial<TOptions>, dataChanged: boolean) => {
      if (destroyed) return;
      guard(() => {
        if (changingOptions) throw new NodaraError("ND_REENTRANT_OPTIONS", "Options cannot be changed while a previous options change is dispatching plugin hooks.");
        changingOptions = true;
        try {
        const next = { ...currentOptions, ...options };
        validateBaseOptions(next);
        const nextData = dataChanged ? normalize(data) : currentData;
        config.validate?.(nextData, next);
        const nextPlugins = new Set(pluginsFor(next));
        const removed = [...activePlugins].filter(plugin => !nextPlugins.has(plugin));
        const oldContext = pluginContext();
        removed.forEach(plugin => activePlugins.delete(plugin));
        const failures: unknown[] = [];
        removed.forEach(plugin => { try { plugin.onDestroy?.(oldContext); } catch (cause) { failures.push(cause); } });
        if (destroyed) return;
        activePlugins = nextPlugins;
        currentOptions = next;
        currentData = nextData;
        for (const plugin of [...activePlugins]) { if (destroyed) break; plugin.onOptionsChange?.(pluginContext()); }
        if (dataChanged) for (const plugin of [...activePlugins]) { if (destroyed) break; plugin.onDataChange?.(pluginContext()); }
        renderUnsafe();
        emit("options:change", currentOptions);
        if (dataChanged) emit("data:change", currentData);
        if (failures.length) throw failures[0];
        } finally { changingOptions = false; }
      });

  };

  const controller: NodaraController<TData, TOptions> = {
    element: container,
    getData: () => currentData,
    getOptions: () => currentOptions,
    update(data) {
      commit(data);
    },
    setOptions(options) { changeState(currentData, options, false); },
    setState(data, options) { changeState(data, options, true); },
    resize: render,
    destroy: release,
    on<TPayload = unknown>(event: string, listener: (payload: TPayload) => void): Unsubscribe {
      if (destroyed) return () => {};
      const eventListeners = listeners.get(event) ?? new Set<Listener>();
      eventListeners.add(listener as Listener);
      listeners.set(event, eventListeners);
      return () => eventListeners.delete(listener as Listener);
    },
  };

  try {
    guard(() => {
      validateBaseOptions(initialOptions);
      activePlugins = new Set(pluginsFor(initialOptions));
      currentData = normalize(initialData);
      config.validate?.(currentData, initialOptions);
      resizeObserver?.observe(container);
      media?.addEventListener?.("change", onThemeChange);
      renderUnsafe();
    });
  } catch (cause) {
    try { release(); } catch { /* Preserve the initial error after completing all cleanup. */ }
    throw cause;
  }
  return controller;
}
