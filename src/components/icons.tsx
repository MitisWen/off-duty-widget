import type { ReactNode } from "react";

function LineIcon({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Sun sinking into the horizon: the widget's mark. */
export function SunsetIcon({ size = 14 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <path d="M2.6 11.2h10.8" />
      <path d="M4.6 11.2a3.4 3.4 0 0 1 6.8 0" />
      <path d="M8 2.4v1.5" />
      <path d="M3.1 4.9l1 1" />
      <path d="M12.9 4.9l-1 1" />
    </LineIcon>
  );
}

export function ChevronIcon({ size = 14, direction }: { size?: number; direction: "up" | "down" }) {
  return (
    <LineIcon size={size}>
      <path d={direction === "up" ? "M4.5 9.8L8 6.2l3.5 3.6" : "M4.5 6.2L8 9.8l3.5-3.6"} />
    </LineIcon>
  );
}

export function PencilIcon({ size = 10 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <path d="M3 13l.7-2.6 6.5-6.5 1.9 1.9-6.5 6.5L3 13z" />
    </LineIcon>
  );
}

export function SparkleIcon({ size = 11 }: { size?: number }) {
  return (
    <LineIcon size={size}>
      <path d="M8 2.5l1.2 3.4 3.4 1.2-3.4 1.2L8 11.7 6.8 8.3 3.4 7.1l3.4-1.2L8 2.5z" />
      <path d="M12.6 11.4l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5.5-1.3z" />
    </LineIcon>
  );
}
