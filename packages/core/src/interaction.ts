/** Owns exactly one pointer gesture; unrelated pointers never finish or cancel it. */
export function trackPointer(
  down: PointerEvent,
  complete: (event: PointerEvent) => void,
  move?: (event: PointerEvent) => void,
  cancel?: () => void,
): () => void {
  let active = true;
  const cleanup = () => {
    if (!active) return;
    active = false;
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointercancel", onCancel);
  };
  const onUp = (event: PointerEvent) => { if (active && event.pointerId === down.pointerId) { cleanup(); complete(event); } };
  const onMove = (event: PointerEvent) => { if (active && event.pointerId === down.pointerId) move?.(event); };
  const onCancel = (event: PointerEvent) => { if (active && event.pointerId === down.pointerId) { cleanup(); cancel?.(); } };
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointercancel", onCancel);
  return cleanup;
}
