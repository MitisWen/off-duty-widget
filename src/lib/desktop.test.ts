import { describe, expect, it } from "vitest";
import {
  getMonitors,
  getOuterRect,
  isDesktop,
  onMoved,
  resetPosition,
  setWidgetPosition,
  setWidgetSize,
  showWidget,
  startDragging,
  vibrancyEnabled,
} from "./desktop";

describe("browser fallback", () => {
  it("detects that it is not running inside Tauri", () => {
    expect(isDesktop()).toBe(false);
  });

  it("resolves every window call without throwing", async () => {
    await expect(showWidget()).resolves.toBeUndefined();
    await expect(startDragging()).resolves.toBeUndefined();
    await expect(setWidgetSize(256, 168)).resolves.toBeUndefined();
    await expect(setWidgetPosition(100, 100)).resolves.toBeUndefined();
    await expect(resetPosition()).resolves.toBeUndefined();
    await expect(getOuterRect()).resolves.toBeNull();
    await expect(getMonitors()).resolves.toEqual([]);
    await expect(vibrancyEnabled()).resolves.toBe(false);

    const unlisten = await onMoved(() => {});
    expect(typeof unlisten).toBe("function");
  });
});
