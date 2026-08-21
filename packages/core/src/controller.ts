import type { BaseOptions, NodaraController, NodaraPlugin, Unsubscribe } from "./types";
import { empty } from "./utils";

type Listener = (payload: unknown) => void;

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
  const normalize = config.normalize ?? ((data: TData) => data);
  const pluginsFor = config.getPlugins ?? ((options: TOptions) => (options.plugins ?? []) as NodaraPlugin<TData, TOptions>[]);
  let currentData = normalize(initialData);
  let currentOptions = initialOptions;
  let cleanup: void | (() => void);
  let destroyed = false;
  let rendering = false;

  const emit = (event: string, payload: unknown) => {
    listeners.get(event)?.forEach((listener) => listener(payload));
  };

  const pluginContext = () => ({ element: container, data: currentData, options: currentOptions });

  const render = () => {
    if (destroyed || rendering) return;
    rendering = true;
    try {
      cleanup?.();
      const context = pluginContext();
      pluginsFor(currentOptions).forEach((plugin) => plugin.beforeRender?.(context));
      cleanup = renderer({ container, data: currentData, options: currentOptions, emit, commit });
      pluginsFor(currentOptions).forEach((plugin) => plugin.afterRender?.(pluginContext()));
      emit("render", { data: currentData, options: currentOptions });
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      currentOptions.onError?.(error);
      emit("error", error);
      throw error;
    } finally {
      rendering = false;
    }
  };

  const commit = (data: TData, event?: string, payload?: unknown) => {
    currentData = normalize(data);
    pluginsFor(currentOptions).forEach((plugin) => plugin.onDataChange?.(pluginContext()));
    render();
    emit("data:change", currentData);
    if (event) emit(event, payload ?? currentData);
  };

  const resizeObserver = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(() => render());
  resizeObserver?.observe(container);

  const controller: NodaraController<TData, TOptions> = {
    element: container,
    getData: () => currentData,
    getOptions: () => currentOptions,
    update(data) {
      commit(data);
    },
    setOptions(options) {
      currentOptions = { ...currentOptions, ...options };
      pluginsFor(currentOptions).forEach((plugin) => plugin.onOptionsChange?.(pluginContext()));
      render();
      emit("options:change", currentOptions);
    },
    resize: render,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cleanup?.();
      resizeObserver?.disconnect();
      pluginsFor(currentOptions).forEach((plugin) => plugin.onDestroy?.(pluginContext()));
      listeners.clear();
      empty(container);
      container.className = container.className.split(/\s+/).filter((name) => name && !name.startsWith("nd-")).join(" ");
      container.removeAttribute("role");
      container.removeAttribute("aria-label");
      delete container.dataset.ndTheme;
    },
    on<TPayload = unknown>(event: string, listener: (payload: TPayload) => void): Unsubscribe {
      const eventListeners = listeners.get(event) ?? new Set<Listener>();
      eventListeners.add(listener as Listener);
      listeners.set(event, eventListeners);
      return () => eventListeners.delete(listener as Listener);
    },
  };

  render();
  return controller;
}
