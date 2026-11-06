import type { Rect } from "./placement";

/** True when running inside the Tauri webview rather than a plain browser tab. */
export function isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in (window as unknown as Record<string, unknown>);
}

async function currentWindow() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  return getCurrentWindow();
}

export async function showWidget(): Promise<void> {
  if (!isDesktop()) return;
  try {
    await (await currentWindow()).show();
  } catch {
    /* the window is already gone */
  }
}

export async function startDragging(): Promise<void> {
  if (!isDesktop()) return;
  try {
    await (await currentWindow()).startDragging();
  } catch {
    /* dragging is not available */
  }
}

export async function setWidgetSize(width: number, height: number): Promise<void> {
  if (!isDesktop()) return;
  try {
    const { LogicalSize } = await import("@tauri-apps/api/dpi");
    await (await currentWindow()).setSize(new LogicalSize(width, height));
  } catch {
    /* ignore */
  }
}

export async function setWidgetPosition(x: number, y: number): Promise<void> {
  if (!isDesktop()) return;
  try {
    const { PhysicalPosition } = await import("@tauri-apps/api/dpi");
    await (await currentWindow()).setPosition(new PhysicalPosition(x, y));
  } catch {
    /* ignore */
  }
}

export async function getOuterRect(): Promise<Rect | null> {
  if (!isDesktop()) return null;
  try {
    const win = await currentWindow();
    const [position, size] = await Promise.all([win.outerPosition(), win.outerSize()]);
    return { x: position.x, y: position.y, width: size.width, height: size.height };
  } catch {
    return null;
  }
}

export async function getMonitors(): Promise<Rect[]> {
  if (!isDesktop()) return [];
  try {
    const { availableMonitors } = await import("@tauri-apps/api/window");
    const monitors = await availableMonitors();
    return monitors.map((monitor) => ({
      x: monitor.position.x,
      y: monitor.position.y,
      width: monitor.size.width,
      height: monitor.size.height,
    }));
  } catch {
    return [];
  }
}

export async function getCurrentMonitor(): Promise<Rect | null> {
  if (!isDesktop()) return null;
  try {
    const { currentMonitor } = await import("@tauri-apps/api/window");
    const monitor = await currentMonitor();
    if (!monitor) return null;
    return {
      x: monitor.workArea.position.x,
      y: monitor.workArea.position.y,
      width: monitor.workArea.size.width,
      height: monitor.workArea.size.height,
    };
  } catch {
    return null;
  }
}

/** Ask Rust to move the widget to the bottom-right corner of the primary display. */
export async function resetPosition(): Promise<void> {
  if (!isDesktop()) return;
  try {
    await invoke("reset_position");
  } catch {
    /* ignore */
  }
}

export async function vibrancyEnabled(): Promise<boolean> {
  if (!isDesktop()) return false;
  try {
    return await invoke<boolean>("vibrancy_enabled");
  } catch {
    return false;
  }
}

export async function onMoved(callback: (position: { x: number; y: number }) => void): Promise<() => void> {
  if (!isDesktop()) return () => {};
  try {
    const win = await currentWindow();
    const unlisten = await win.onMoved(({ payload }) => callback({ x: payload.x, y: payload.y }));
    return unlisten;
  } catch {
    return () => {};
  }
}

/** Show or hide the separate encouragement bubble window. */
export async function setBubbleVisible(visible: boolean): Promise<void> {
  if (!isDesktop()) return;
  try {
    await invoke("set_bubble_visible", { visible });
  } catch {
    /* ignore */
  }
}

/** Tell Rust the bubble was clicked so the card can take over the message. */
export async function bubbleClicked(): Promise<void> {
  if (!isDesktop()) return;
  try {
    await invoke("bubble_clicked");
  } catch {
    /* ignore */
  }
}

export async function onBubbleClicked(callback: () => void): Promise<() => void> {
  if (!isDesktop()) return () => {};
  try {
    const { listen } = await import("@tauri-apps/api/event");
    return await listen("bubble-clicked", () => callback());
  } catch {
    return () => {};
  }
}

export async function onWidgetShown(callback: () => void): Promise<() => void> {
  if (!isDesktop()) return () => {};
  try {
    const { listen } = await import("@tauri-apps/api/event");
    return await listen("widget-shown", () => callback());
  } catch {
    return () => {};
  }
}

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke<T>(command, args);
}
