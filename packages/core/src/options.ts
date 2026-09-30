import type { BaseOptions } from "./types";
import { NodaraError } from "./utils";

/** Validate before mutating a live controller. Undefined explicitly restores a default. */
export function validateBaseOptions(options: BaseOptions): void {
  const invalid = (field: string): never => { throw new NodaraError("ND_INVALID_OPTIONS", `Invalid option: ${field}.`); };
  if (!options || typeof options !== "object" || Array.isArray(options)) invalid("options");
  if (options.theme !== undefined && !["light", "dark", "system"].includes(options.theme)) invalid("theme");
  if (options.renderer !== undefined && !["auto", "dom", "canvas", "webgl"].includes(options.renderer)) invalid("renderer");
  for (const key of ["ariaLabel", "className", "locale"] as const) if (options[key] !== undefined && typeof options[key] !== "string") invalid(key);
  if (options.locale !== undefined) { try { new Intl.DateTimeFormat(options.locale); } catch { invalid("locale"); } }
  if (options.onError !== undefined && typeof options.onError !== "function") invalid("onError");
  if (options.interactive !== undefined && typeof options.interactive !== "boolean") {
    if (!options.interactive || typeof options.interactive !== "object" || Array.isArray(options.interactive)) invalid("interactive");
    for (const [key, value] of Object.entries(options.interactive)) if (!["keyboard", "pointer", "pan", "zoom"].includes(key) || (value !== undefined && typeof value !== "boolean")) invalid(`interactive.${key}`);
  }
  if (options.performance !== undefined) {
    if (!options.performance || typeof options.performance !== "object" || Array.isArray(options.performance)) invalid("performance");
    for (const [key, value] of Object.entries(options.performance)) if (value !== undefined && (typeof value !== "number" || !Number.isFinite(value) || value < (key === "maxDevicePixelRatio" ? 0.1 : 0))) invalid(`performance.${key}`);
  }
  if (options.tokens !== undefined) {
    if (!options.tokens || typeof options.tokens !== "object" || Array.isArray(options.tokens)) invalid("tokens");
    for (const [key, value] of Object.entries(options.tokens)) if (value !== undefined && (key === "borderRadius" ? typeof value !== "number" || !Number.isFinite(value) || value < 0 : typeof value !== "string")) invalid(`tokens.${key}`);
  }
  if (options.plugins !== undefined) {
    if (!Array.isArray(options.plugins)) invalid("plugins");
    for (const plugin of options.plugins) {
      if (!plugin || typeof plugin !== "object" || typeof plugin.name !== "string") invalid("plugin");
      for (const hook of ["beforeRender", "afterRender", "onDataChange", "onOptionsChange", "onDestroy"] as const) if (plugin[hook] !== undefined && typeof plugin[hook] !== "function") invalid(`plugin.${hook}`);
    }
  }
  const extended = options as BaseOptions & { timeZone?: string };
  if (extended.timeZone !== undefined) { try { if (typeof extended.timeZone !== "string") invalid("timeZone"); new Intl.DateTimeFormat(undefined, { timeZone: extended.timeZone }); } catch { invalid("timeZone"); } }
}
