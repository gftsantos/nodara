export interface Point2D { x: number; y: number }
export type HitRegion =
  | { kind: "union"; regions: HitRegion[] }
  | { kind: "circle"; x: number; y: number; radius: number }
  | { kind: "rect"; x: number; y: number; width: number; height: number }
  | { kind: "sector"; x: number; y: number; innerRadius: number; outerRadius: number; start: number; end: number }
  | { kind: "polygon"; points: Point2D[] }
  | { kind: "segment"; from: Point2D; to: Point2D; tolerance: number };

export function containsPoint(region: HitRegion, point: Point2D): boolean {
  if (region.kind === "union") return region.regions.some(part => containsPoint(part, point));
  if (region.kind === "circle") return region.radius > 0 && Math.hypot(point.x - region.x, point.y - region.y) <= region.radius;
  if (region.kind === "rect") return region.width > 0 && region.height > 0 && point.x >= region.x && point.x <= region.x + region.width && point.y >= region.y && point.y <= region.y + region.height;
  if (region.kind === "sector") {
    const distance = Math.hypot(point.x - region.x, point.y - region.y);
    const span = region.end - region.start;
    if (region.outerRadius <= Math.max(0, region.innerRadius) || span <= 0 || distance < region.innerRadius || distance > region.outerRadius) return false;
    const tau = Math.PI * 2;
    const angle = ((Math.atan2(point.y - region.y, point.x - region.x) - region.start) % tau + tau) % tau;
    return span >= tau || angle <= span;
  }
  if (region.kind === "segment") {
    const dx = region.to.x - region.from.x; const dy = region.to.y - region.from.y;
    const squared = dx * dx + dy * dy;
    const t = squared ? Math.max(0, Math.min(1, ((point.x - region.from.x) * dx + (point.y - region.from.y) * dy) / squared)) : 0;
    return Math.hypot(point.x - region.from.x - t * dx, point.y - region.from.y - t * dy) <= region.tolerance;
  }
  let inside = false;
  for (let index = 0, previous = region.points.length - 1; index < region.points.length; previous = index++) {
    const a = region.points[index]!; const b = region.points[previous]!;
    if (containsPoint({ kind: "segment", from: a, to: b, tolerance: 1e-8 }, point)) return true;
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
