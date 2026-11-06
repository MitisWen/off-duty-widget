export type Phase = "before" | "working" | "done" | "rest";

export interface WorkHours {
  /** minutes after midnight */
  start: number;
  /** minutes after midnight */
  end: number;
}

export interface PhaseState {
  phase: Phase;
  /** seconds until the phase target, or seconds past the end when done */
  seconds: number;
  /** 0..1 progress through the workday, 0 outside of it */
  progress: number;
}

export const DEFAULT_HOURS: WorkHours = { start: 9 * 60, end: 18 * 60 };

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds % 60)}`;
}

export function formatMinutes(minutes: number): string {
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

export function parseTime(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function validateHours(start: number | null, end: number | null): boolean {
  return start !== null && end !== null && end > start;
}

export function readPhase(date: Date, hours: WorkHours): PhaseState {
  const day = date.getDay();
  const seconds = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  const start = hours.start * 60;
  const end = hours.end * 60;

  if (day === 0 || day === 6) {
    return { phase: "rest", seconds: 0, progress: 0 };
  }
  if (seconds < start) {
    return { phase: "before", seconds: start - seconds, progress: 0 };
  }
  if (seconds < end) {
    return { phase: "working", seconds: end - seconds, progress: (seconds - start) / (end - start) };
  }
  return { phase: "done", seconds: seconds - end, progress: 1 };
}
