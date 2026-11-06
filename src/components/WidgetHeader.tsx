import { ChevronIcon, SunsetIcon } from "./icons";
import type { DragHandlers } from "../hooks/useWindowDrag";

interface WidgetHeaderProps {
  drag: DragHandlers;
  onCollapse: () => void;
  onDoubleClick: () => void;
}

export function WidgetHeader({ drag, onCollapse, onDoubleClick }: WidgetHeaderProps) {
  return (
    <header className="widget__header" {...drag} onDoubleClick={onDoubleClick} title="拖动移动，双击复位">
      <span className="widget__mark" aria-hidden="true">
        <SunsetIcon />
      </span>
      <span className="widget__title">下班倒计时</span>
      <button
        type="button"
        className="icon-button"
        aria-label="收起"
        title="收起"
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onCollapse();
        }}
      >
        <ChevronIcon direction="up" />
      </button>
    </header>
  );
}
