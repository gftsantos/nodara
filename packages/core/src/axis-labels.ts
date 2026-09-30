/** Place a small set of measured axis labels without clipping or collisions. */
export function layoutAxisLabels(candidates: Array<{ text: string; x: number }>, width: number, measure: (text: string) => number) {
  const result: Array<{ text: string; x: number; left: number; right: number }> = [];
  const inset = 4;
  const available = Math.max(0, width - inset * 2);
  for (const candidate of [...candidates].sort((a, b) => a.x - b.x)) {
    if (!Number.isFinite(candidate.x) || !candidate.text || !available) continue;
    let text = candidate.text;
    if (measure(text) > available) {
      const letters = Array.from(text);
      let low = 0; let high = letters.length;
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        if (measure(`${letters.slice(0, middle).join("")}…`) <= available) low = middle;
        else high = middle - 1;
      }
      text = `${letters.slice(0, low).join("")}…`;
    }
    const measured = measure(text);
    if (!Number.isFinite(measured) || measured > available) continue;
    const half = measured / 2;
    const x = Math.max(inset + half, Math.min(width - inset - half, candidate.x));
    const left = x - half; const right = x + half;
    if (left < (result.at(-1)?.right ?? -Infinity) + 10) continue;
    result.push({ text, x, left, right });
  }
  return result;
}
