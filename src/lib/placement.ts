export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function intersects(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function isVisibleOnAnyMonitor(rect: Rect, monitors: Rect[]): boolean {
  return monitors.some((monitor) => intersects(rect, monitor));
}

export function overflows(rect: Rect, area: Rect): boolean {
  return (
    rect.x < area.x ||
    rect.y < area.y ||
    rect.x + rect.width > area.x + area.width ||
    rect.y + rect.height > area.y + area.height
  );
}

/** Keep the rect's size, move it as little as possible so it sits inside the area. */
export function clampIntoArea(rect: Rect, area: Rect): { x: number; y: number } {
  const x = Math.min(Math.max(rect.x, area.x), area.x + area.width - rect.width);
  const y = Math.min(Math.max(rect.y, area.y), area.y + area.height - rect.height);
  return { x: Math.round(x), y: Math.round(y) };
}
