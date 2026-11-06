import { ChevronIcon, SunsetIcon } from "./icons";
import type { DragHandlers } from "../hooks/useWindowDrag";

interface CollapsedPillProps {
  label: string;
  value: string | null;
  drag: DragHandlers;
  wasDragging: () => boolean;
  onExpand: () => void;
}

export function CollapsedPill({ label, value, drag, wasDragging, onExpand }: CollapsedPillProps) {
  return (
    <div
      className="pill"
      role="timer"
      aria-label={`${label}${value ? ` ${value}` : ""}`}
      aria-live="off"
      title="拖动移动，点击展开"
      {...drag}
      onClick={() => {
        if (!wasDragging()) onExpand();
      }}
    >
      <span className="pill__mark" aria-hidden="true">
        <SunsetIcon size={13} />
      </span>
      <span className="pill__label">{label}</span>
      {value ? <span className="pill__value">{value}</span> : null}
      <button
        type="button"
        className="icon-button"
        aria-label="展开"
        title="展开"
        onPointerDown={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onExpand();
        }}
      >
        <ChevronIcon direction="down" />
      </button>
    </div>
  );
}
