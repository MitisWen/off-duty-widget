import { describe, expect, it } from "vitest";
import { formatClock, formatMinutes, parseTime, readPhase, validateHours, DEFAULT_HOURS } from "./countdown";

describe("parseTime", () => {
  it("parses HH:MM into minutes after midnight", () => {
    expect(parseTime("09:00")).toBe(540);
    expect(parseTime("9:05")).toBe(545);
    expect(parseTime("23:59")).toBe(1439);
  });

  it("rejects malformed or out-of-range values", () => {
    expect(parseTime("")).toBeNull();
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("09:60")).toBeNull();
    expect(parseTime("0900")).toBeNull();
  });
});

describe("formatting", () => {
  it("formats minutes as HH:MM", () => {
    expect(formatMinutes(0)).toBe("00:00");
    expect(formatMinutes(545)).toBe("09:05");
    expect(formatMinutes(1439)).toBe("23:59");
  });

  it("formats seconds as HH:MM:SS and clamps negatives", () => {
    expect(formatClock(0)).toBe("00:00:00");
    expect(formatClock(3661)).toBe("01:01:01");
    expect(formatClock(-5)).toBe("00:00:00");
  });
});

describe("validateHours", () => {
  it("requires both values and end after start", () => {
    expect(validateHours(540, 1080)).toBe(true);
    expect(validateHours(1080, 540)).toBe(false);
    expect(validateHours(540, 540)).toBe(false);
    expect(validateHours(null, 1080)).toBe(false);
  });
});

describe("readPhase", () => {
  // 2026-11-02 is a Monday, 2026-11-07 is a Saturday.
  const monday = (hours: number, minutes: number, seconds = 0) => new Date(2026, 10, 2, hours, minutes, seconds);

  it("counts down to the workday start", () => {
    const state = readPhase(monday(8, 59, 30), DEFAULT_HOURS);
    expect(state.phase).toBe("before");
    expect(state.seconds).toBe(30);
    expect(state.progress).toBe(0);
  });

  it("enters the workday exactly on the start minute", () => {
    const state = readPhase(monday(9, 0), DEFAULT_HOURS);
    expect(state.phase).toBe("working");
    expect(state.seconds).toBe(9 * 3600);
    expect(state.progress).toBe(0);
  });

  it("counts down to the end of the workday", () => {
    const state = readPhase(monday(17, 59, 59), DEFAULT_HOURS);
    expect(state.phase).toBe("working");
    expect(state.seconds).toBe(1);
    expect(state.progress).toBeCloseTo(1, 3);
  });

  it("switches to overtime exactly on the end minute", () => {
    expect(readPhase(monday(18, 0), DEFAULT_HOURS)).toMatchObject({ phase: "done", seconds: 0, progress: 1 });
    expect(readPhase(monday(18, 30), DEFAULT_HOURS).seconds).toBe(1800);
  });

  it("treats weekends as rest days", () => {
    const saturday = new Date(2026, 10, 7, 12, 0);
    expect(readPhase(saturday, DEFAULT_HOURS)).toEqual({ phase: "rest", seconds: 0, progress: 0 });
  });
});
