import type { NodaraController, Unsubscribe } from "./types";
import { empty } from "./utils";

type Listener = (payload: unknown) => void;

export interface RenderContext<TData> {
  container: HTMLElement;
  data: TData;
  emit: (event: string, payload: unknown) => void;
}

export type Renderer<TData> = (context: RenderContext<TData>) => void | (() => void);

export function createController<TData>(
  container: HTMLElement,
  initialData: TData,
  renderer: Renderer<TData>,
): NodaraController<TData> {
  const listeners = new Map<string, Set<Listener>>();
  let currentData = initialData;
  let cleanup: void | (() => void);
  let destroyed = false;

  const emit = (event: string, payload: unknown) => {
    listeners.get(event)?.forEach((listener) => listener(payload));
  };

  const render = () => {
    if (destroyed) return;
    cleanup?.();
    cleanup = renderer({ container, data: currentData, emit });
  };

  const resizeObserver = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(() => render());
  resizeObserver?.observe(container);
  render();

  return {
    element: container,
    update(data) {
      currentData = data;
      render();
      emit("data:change", data);
    },
    resize: render,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cleanup?.();
      resizeObserver?.disconnect();
      listeners.clear();
      empty(container);
      container.classList.remove("nd-root");
    },
    on<TPayload = unknown>(event: string, listener: (payload: TPayload) => void): Unsubscribe {
      const eventListeners = listeners.get(event) ?? new Set<Listener>();
      eventListeners.add(listener as Listener);
      listeners.set(event, eventListeners);
      return () => eventListeners.delete(listener as Listener);
    },
  };
}
