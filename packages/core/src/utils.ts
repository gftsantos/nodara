import type { DateInput } from "./types";

export function resolveElement(target: string | Element): HTMLElement {
  const element = typeof target === "string" ? document.querySelector(target) : target;
  if (!(element instanceof HTMLElement)) {
    throw new NodaraError("ND_TARGET_NOT_FOUND", `Could not find a valid target for ${String(target)}.`);
  }
  return element;
}

export function toTimestamp(input: DateInput, field = "date"): number {
  const value = input instanceof Date ? input.getTime() : typeof input === "number" ? input : typeof input === "string" ? Date.parse(input) : NaN;
  if (!Number.isFinite(value) || Math.abs(value) > 8.64e15) {
    throw new NodaraError("ND_INVALID_DATE", `Invalid ${field}: ${String(input)}.`);
  }
  return value;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function percentage(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return clamp(((value - min) / (max - min)) * 100, 0, 100);
}

export function empty(element: HTMLElement): void {
  element.replaceChildren();
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();
export function formatDate(timestamp: number, locale = "en", options?: Intl.DateTimeFormatOptions): string {
  const settings = options ?? { day: "2-digit", month: "short" };
  const key = JSON.stringify([locale, Object.entries(settings).sort(([a], [b]) => a.localeCompare(b))]);
  let formatter = dateFormatters.get(key);
  if (!formatter) formatter = new Intl.DateTimeFormat(locale, settings);
  // Bounded LRU: do not retain a formatter per event or per arbitrary user option.
  dateFormatters.delete(key);
  dateFormatters.set(key, formatter);
  if (dateFormatters.size > 32) dateFormatters.delete(dateFormatters.keys().next().value!);
  return formatter.format(timestamp);
}

export class NodaraError extends Error {
  constructor(public readonly code: string, message: string, public readonly details?: unknown) {
    super(message);
    this.name = "NodaraError";
  }
}
