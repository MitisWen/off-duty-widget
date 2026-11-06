import { useCallback, useEffect, useRef, useState } from "react";
import { WidgetCard } from "./components/WidgetCard";
import { CollapsedPill } from "./components/CollapsedPill";
import { useNow } from "./hooks/useNow";
import { useWindowDrag } from "./hooks/useWindowDrag";
import { formatClock, formatMinutes, readPhase, type Phase, type WorkHours } from "./lib/countdown";
import { clampIntoArea, isVisibleOnAnyMonitor, overflows } from "./lib/placement";
import { overtimeMessage } from "./lib/praise";
import * as desktop from "./lib/desktop";
import {
  readCollapsed,
  readHours,
  readPosition,
  writeCollapsed,
  writeHours,
  writePosition,
} from "./lib/storage";

const EXPANDED = { width: 256, height: 168 };
const COLLAPSED = { width: 184, height: 40 };

/** The bubble is a notification: it folds into the card after this delay. */
const BUBBLE_AUTO_RETRACT_MS = 10_000;

const PHASE_LABEL: Record<Phase, string> = {
  before: "距上班",
  working: "距下班",
  done: "加班",
  rest: "休息日",
};

async function rememberCurrentPosition(): Promise<void> {
  const rect = await desktop.getOuterRect();
  if (rect) writePosition({ x: rect.x, y: rect.y });
}

async function restorePlacement(): Promise<void> {
  const saved = readPosition();
  const [rect, monitors] = await Promise.all([desktop.getOuterRect(), desktop.getMonitors()]);
  if (saved && rect) {
    const candidate = { x: saved.x, y: saved.y, width: rect.width, height: rect.height };
    if (isVisibleOnAnyMonitor(candidate, monitors)) {
      await desktop.setWidgetPosition(saved.x, saved.y);
      return;
    }
  }
  await desktop.resetPosition();
  await rememberCurrentPosition();
}

async function keepOnScreen(): Promise<void> {
  const [rect, area] = await Promise.all([desktop.getOuterRect(), desktop.getCurrentMonitor()]);
  if (!rect || !area || !overflows(rect, area)) return;
  const { x, y } = clampIntoArea(rect, area);
  await desktop.setWidgetPosition(x, y);
  writePosition({ x, y });
}

export default function App() {
  const now = useNow();
  const [hours, setHours] = useState<WorkHours>(readHours);
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);
  const [editing, setEditing] = useState(false);
  const [ready, setReady] = useState(false);
  const [shownTick, setShownTick] = useState(0);
  const [dismissedBucket, setDismissedBucket] = useState<number | null>(null);
  const { handlers, consumedDrag } = useWindowDrag();

  const state = readPhase(now, hours);
  const value = state.phase === "rest" ? "休息日" : formatClock(state.seconds);
  const label = state.phase === "rest" ? "好好放松一下" : PHASE_LABEL[state.phase];
  const percent = state.phase === "rest" ? null : Math.round(state.progress * 100);
  const scheduleText = `${formatMinutes(hours.start)} – ${formatMinutes(hours.end)}`;

  const overtime = state.phase === "done" ? overtimeMessage(state.seconds) : null;
  const bucket = overtime?.bucket ?? null;
  // Clicking the bubble moves that message into the card until the next half hour.
  const inlineMessage = overtime && dismissedBucket === bucket ? overtime : null;
  const bubbleVisible = state.phase === "done" && bucket !== null && dismissedBucket !== bucket && !collapsed && !editing;

  // Size the window, restore its spot and only then reveal it, so startup never
  // flashes an expanded card before collapsing.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await desktop.setWidgetSize(collapsed ? COLLAPSED.width : EXPANDED.width, collapsed ? COLLAPSED.height : EXPANDED.height);
      await restorePlacement();
      const vibrancy = await desktop.vibrancyEnabled();
      if (cancelled) return;
      document.documentElement.dataset.vibrancy = vibrancy ? "on" : "off";
      await desktop.showWidget();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // Bootstrapped once; later collapses are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    void (async () => {
      await desktop.setWidgetSize(collapsed ? COLLAPSED.width : EXPANDED.width, collapsed ? COLLAPSED.height : EXPANDED.height);
      if (!collapsed) await keepOnScreen();
    })();
  }, [collapsed, ready]);

  // Persist window moves, but ignore the burst the OS emits while it places the
  // window right after startup.
  useEffect(() => {
    if (!ready) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    const listenAt = Date.now();
    void desktop.onMoved((position) => {
      if (Date.now() - listenAt < 1500) return;
      writePosition(position);
    }).then((fn) => {
      if (disposed) fn();
      else unlisten = fn;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [ready]);

  // The bubble lives in its own window; keep it in sync with the card's state.
  // Resize first, otherwise the bubble can be placed against the collapsed card.
  useEffect(() => {
    if (!ready) return;
    void (async () => {
      if (bubbleVisible) {
        await desktop.setWidgetSize(EXPANDED.width, EXPANDED.height);
      }
      await desktop.setBubbleVisible(bubbleVisible);
    })();
  }, [ready, bubbleVisible, shownTick]);

  const bucketRef = useRef(bucket);
  bucketRef.current = bucket;

  // Every new message shows as a bubble for 10 seconds, then folds into the card.
  useEffect(() => {
    if (!ready || !bubbleVisible || bucket === null) return;
    const id = window.setTimeout(() => setDismissedBucket(bucket), BUBBLE_AUTO_RETRACT_MS);
    return () => window.clearTimeout(id);
  }, [ready, bubbleVisible, bucket]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void desktop.onBubbleClicked(() => {
      if (bucketRef.current !== null) setDismissedBucket(bucketRef.current);
    }).then((fn) => {
      if (disposed) fn();
      else unlisten = fn;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (state.phase !== "done" && dismissedBucket !== null) setDismissedBucket(null);
  }, [state.phase, dismissedBucket]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void desktop.onWidgetShown(() => setShownTick((tick) => tick + 1)).then((fn) => {
      if (disposed) fn();
      else unlisten = fn;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const collapse = useCallback(() => {
    setEditing(false);
    setCollapsed(true);
    writeCollapsed(true);
  }, []);

  const expand = useCallback(() => {
    setCollapsed(false);
    writeCollapsed(false);
  }, []);

  const saveHours = useCallback((next: WorkHours) => {
    setHours(next);
    writeHours(next);
    setEditing(false);
  }, []);

  const resetPosition = useCallback(async () => {
    await desktop.resetPosition();
    await rememberCurrentPosition();
  }, []);

  const startEditing = useCallback(() => setEditing(true), []);
  const cancelEditing = useCallback(() => setEditing(false), []);

  if (collapsed) {
    return (
      <CollapsedPill
        label={PHASE_LABEL[state.phase]}
        value={state.phase === "rest" ? null : value}
        drag={handlers}
        wasDragging={consumedDrag}
        onExpand={expand}
      />
    );
  }

  return (
    <WidgetCard
      phase={state.phase}
      value={value}
      label={label}
      percent={percent}
      scheduleText={scheduleText}
      hours={hours}
      editing={editing}
      overtime={inlineMessage}
      drag={handlers}
      onCollapse={collapse}
      onDoubleClick={resetPosition}
      onEdit={startEditing}
      onSave={saveHours}
      onCancel={cancelEditing}
    />
  );
}
