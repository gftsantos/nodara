import type { ThemeTokens, VisualTheme } from "./types";

export const defaultDarkTokens: ThemeTokens = {
  background: "#0b0d0e",
  surface: "#15181a",
  foreground: "#f3f4ef",
  muted: "#8c918b",
  border: "rgba(255,255,255,.12)",
  primary: "#7884ff",
  positive: "#c8fa63",
  warning: "#f5c451",
  danger: "#ff7657",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  borderRadius: 6,
};

export const defaultLightTokens: ThemeTokens = {
  background: "#f7f7f3",
  surface: "#ffffff",
  foreground: "#161814",
  muted: "#676c65",
  border: "rgba(20,24,19,.14)",
  primary: "#5967f2",
  positive: "#5d8f1d",
  warning: "#9d7110",
  danger: "#d74b2e",
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  borderRadius: 6,
};

export function resolveTheme(theme: VisualTheme = "system"): "light" | "dark" {
  if (theme !== "system") return theme;
  if (typeof matchMedia === "undefined") return "light";
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(
  element: HTMLElement,
  theme: VisualTheme = "system",
  overrides: Partial<ThemeTokens> = {},
): ThemeTokens {
  const resolved = resolveTheme(theme);
  const tokens = { ...(resolved === "dark" ? defaultDarkTokens : defaultLightTokens), ...overrides };
  element.dataset.ndTheme = resolved;
  element.style.setProperty("--nd-bg", tokens.background);
  element.style.setProperty("--nd-surface", tokens.surface);
  element.style.setProperty("--nd-fg", tokens.foreground);
  element.style.setProperty("--nd-muted", tokens.muted);
  element.style.setProperty("--nd-border", tokens.border);
  element.style.setProperty("--nd-primary", tokens.primary);
  element.style.setProperty("--nd-positive", tokens.positive);
  element.style.setProperty("--nd-warning", tokens.warning);
  element.style.setProperty("--nd-danger", tokens.danger);
  element.style.setProperty("--nd-font", tokens.fontFamily);
  element.style.setProperty("--nd-radius", `${tokens.borderRadius}px`);
  return tokens;
}
