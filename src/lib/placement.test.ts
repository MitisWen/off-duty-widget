import { describe, expect, it } from "vitest";
import { clampIntoArea, intersects, isVisibleOnAnyMonitor, overflows } from "./placement";

const monitor = { x: 0, y: 0, width: 1920, height: 1080 };

describe("intersects", () => {
  it("detects overlapping rectangles", () => {
    expect(intersects({ x: 10, y: 10, width: 100, height: 100 }, monitor)).toBe(true);
  });

  it("rejects rectangles that only touch an edge", () => {
    expect(intersects({ x: 1920, y: 0, width: 100, height: 100 }, monitor)).toBe(false);
    expect(intersects({ x: -100, y: 0, width: 100, height: 100 }, monitor)).toBe(false);
  });
});

describe("isVisibleOnAnyMonitor", () => {
  it("accepts a rect on one of several monitors", () => {
    const second = { x: 1920, y: 0, width: 1280, height: 720 };
    expect(isVisibleOnAnyMonitor({ x: 2000, y: 100, width: 256, height: 168 }, [monitor, second])).toBe(true);
  });

  it("rejects a rect that is fully off-screen", () => {
    expect(isVisibleOnAnyMonitor({ x: 5000, y: 5000, width: 256, height: 168 }, [monitor])).toBe(false);
  });
});

describe("overflows", () => {
  it("flags rects past the right or bottom edge", () => {
    expect(overflows({ x: 1800, y: 100, width: 256, height: 168 }, monitor)).toBe(true);
    expect(overflows({ x: 100, y: 1000, width: 256, height: 168 }, monitor)).toBe(true);
    expect(overflows({ x: 100, y: 100, width: 256, height: 168 }, monitor)).toBe(false);
  });
});

describe("clampIntoArea", () => {
  it("moves an overflowing rect back inside, keeping its size", () => {
    expect(clampIntoArea({ x: 1800, y: 1000, width: 256, height: 168 }, monitor)).toEqual({ x: 1664, y: 912 });
  });

  it("leaves an inside rect untouched", () => {
    expect(clampIntoArea({ x: 40, y: 50, width: 256, height: 168 }, monitor)).toEqual({ x: 40, y: 50 });
  });

  it("clamps to the area origin for oversized negatives", () => {
    expect(clampIntoArea({ x: -50, y: -50, width: 256, height: 168 }, monitor)).toEqual({ x: 0, y: 0 });
  });
});
