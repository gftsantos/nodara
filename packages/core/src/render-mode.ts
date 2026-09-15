import type { RenderMode } from "./types";

export interface RenderModeThresholds {
  canvasThreshold?: number;
  webglThreshold?: number;
}

export function supportsWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(context);
  } catch {
    return false;
  }
}

export function resolveRenderMode(
  requested: RenderMode = "auto",
  itemCount = 0,
  thresholds: RenderModeThresholds = {},
  webglAvailable?: boolean,
): Exclude<RenderMode, "auto"> {
  if (requested === "webgl") return (webglAvailable ?? supportsWebGL()) ? "webgl" : "canvas";
  if (requested !== "auto") return requested;
  const canvasThreshold = thresholds.canvasThreshold ?? 750;
  const webglThreshold = thresholds.webglThreshold ?? 5_000;
  if (itemCount >= webglThreshold && (webglAvailable ?? supportsWebGL())) return "webgl";
  if (itemCount >= canvasThreshold) return "canvas";
  return "dom";
}

export function isInteractionEnabled(
  interactive: boolean | { keyboard?: boolean; pointer?: boolean; pan?: boolean; zoom?: boolean } | undefined,
  capability: "keyboard" | "pointer" | "pan" | "zoom",
): boolean {
  if (interactive === false) return false;
  if (interactive === true || interactive === undefined) return true;
  return interactive[capability] !== false;
}
