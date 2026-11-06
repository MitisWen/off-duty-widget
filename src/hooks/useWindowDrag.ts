import { useCallback, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { startDragging } from "../lib/desktop";

const DRAG_THRESHOLD = 3;

export type DragHandlers = {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
};

/**
 * Native window dragging: we only hand off to the OS once the pointer has moved
 * a few pixels, so a plain click (or a double click) still reaches the webview.
 */
export function useWindowDrag() {
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);
  const dragged = useRef(false);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    origin.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    dragged.current = false;
  }, []);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const start = origin.current;
    if (!start || start.id !== event.pointerId || dragged.current) return;
    const movedX = Math.abs(event.clientX - start.x);
    const movedY = Math.abs(event.clientY - start.y);
    if (movedX > DRAG_THRESHOLD || movedY > DRAG_THRESHOLD) {
      dragged.current = true;
      void startDragging();
    }
  }, []);

  const onPointerEnd = useCallback(() => {
    origin.current = null;
  }, []);

  const handlers: DragHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
  };

  /** True when the last pointer sequence turned into a drag, so clicks can be ignored. */
  const consumedDrag = useCallback(() => dragged.current, []);

  return { handlers, consumedDrag };
}
