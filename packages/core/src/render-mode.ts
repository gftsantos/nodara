import type { RenderMode } from "./types";

export interface RenderModeThresholds {
  canvasThreshold?: number;
  webglThreshold?: number;
}

export function supportsWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function resolveRenderMode(
  requested: RenderMode = "auto",
  itemCount = 0,
  thresholds: RenderModeThresholds = {},
  webglAvailable = supportsWebGL(),
): Exclude<RenderMode, "auto"> {
  if (requested === "webgl") return webglAvailable ? "webgl" : "canvas";
  if (requested !== "auto") return requested;
  const canvasThreshold = thresholds.canvasThreshold ?? 750;
  const webglThreshold = thresholds.webglThreshold ?? 5_000;
  if (itemCount >= webglThreshold && webglAvailable) return "webgl";
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
