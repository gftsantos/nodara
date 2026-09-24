/** Limits for the demo editors, not limits on the public library API. */
export const PORTAL_JSON_LIMIT = 2_000_000;
export function parsePortalJSON<T = unknown>(source: string): T {
  if (source.length > PORTAL_JSON_LIMIT) throw new Error("O editor admite até 2 milhões de caracteres JSON. Usa dados sintéticos mais pequenos.");
  const value: unknown = JSON.parse(source);
  const pending = [{ value, depth: 0 }];
  let visited = 0;
  while (pending.length) {
    const current = pending.pop()!;
    if (++visited > 100_000 || current.depth > 64) throw new Error("JSON demasiado complexo para este editor (64 níveis / 100 mil valores).");
    if (current.value !== null && typeof current.value === "object") {
      for (const [key, child] of Object.entries(current.value)) {
        if (pending.length + visited >= 100_000) throw new Error("JSON demasiado complexo para este editor (100 mil valores).");
        if (["__proto__", "constructor", "prototype"].includes(key)) throw new Error("O JSON contém uma chave reservada.");
        pending.push({ value: child, depth: current.depth + 1 });
      }
    }
  }
  return value as T;
}
