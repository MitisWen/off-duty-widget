import { DEFAULT_HOURS, validateHours, type WorkHours } from "./countdown";

const HOURS_KEY = "offwork:hours";
const COLLAPSED_KEY = "offwork:collapsed";
const POSITION_KEY = "offwork:position";

export interface StoredPosition {
  x: number;
  y: number;
}

// localStorage can be unavailable (privacy modes, sandboxed webviews); fall back
// to a session-only map so the widget keeps working.
const memory = new Map<string, string>();

function readValue(key: string): string | null {
  try {
    const value = globalThis.localStorage?.getItem(key);
    if (value !== null && value !== undefined) return value;
  } catch {
    /* ignore */
  }
  return memory.get(key) ?? null;
}

function writeValue(key: string, value: string): void {
  memory.set(key, value);
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    /* session-only */
  }
}

export function readHours(): WorkHours {
  const raw = readValue(HOURS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<WorkHours>;
      const start = typeof parsed.start === "number" ? parsed.start : null;
      const end = typeof parsed.end === "number" ? parsed.end : null;
      if (start !== null && end !== null && validateHours(start, end)) {
        return { start, end };
      }
    } catch {
      /* fall back to defaults */
    }
  }
  return { ...DEFAULT_HOURS };
}

export function writeHours(hours: WorkHours): void {
  writeValue(HOURS_KEY, JSON.stringify(hours));
}

export function readCollapsed(): boolean {
  return readValue(COLLAPSED_KEY) === "1";
}

export function writeCollapsed(collapsed: boolean): void {
  writeValue(COLLAPSED_KEY, collapsed ? "1" : "0");
}

export function readPosition(): StoredPosition | null {
  const raw = readValue(POSITION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPosition>;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writePosition(position: StoredPosition): void {
  writeValue(POSITION_KEY, JSON.stringify(position));
}
