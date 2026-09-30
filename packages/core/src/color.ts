function expandHex(value: string): string {
  const clean = value.replace("#", "");
  return clean.length === 3 ? clean.split("").map((character) => character + character).join("") : clean;
}

export function hexToRgb(value: string): { r: number; g: number; b: number } | undefined {
  const hex = expandHex(value.trim());
  if (!/^[0-9a-f]{6}$/i.test(hex)) return undefined;
  return { r: Number.parseInt(hex.slice(0, 2), 16), g: Number.parseInt(hex.slice(2, 4), 16), b: Number.parseInt(hex.slice(4, 6), 16) };
}

export function relativeLuminance(value: string): number {
  const rgb = hexToRgb(value);
  if (!rgb) return 0;
  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

export function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function readableTextColor(background: string, light = "#ffffff", dark = "#111111"): string {
  return contrastRatio(background, light) >= contrastRatio(background, dark) ? light : dark;
}
