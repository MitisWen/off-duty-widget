import { useNow } from "../hooks/useNow";
import { readPhase } from "../lib/countdown";
import { bubbleClicked } from "../lib/desktop";
import { overtimeMessage } from "../lib/praise";
import { readHours } from "../lib/storage";
import { SparkleIcon } from "./icons";

/**
 * Rendered in its own small always-on-top window. Keeping it outside the card
 * window is what lets the native blur cover only the message bubble.
 */
export function OvertimeBubble() {
  const now = useNow();
  const state = readPhase(now, readHours());
  const message = overtimeMessage(state.phase === "done" ? state.seconds : 0);

  return (
    <button
      type="button"
      className={`bubble phase-${state.phase}`}
      title="点击收进卡片"
      onClick={() => {
        void bubbleClicked();
      }}
    >
      <span className="bubble__title">
        <SparkleIcon size={12} />
        {message.title}
      </span>
      <span className="bubble__note">{message.note}</span>
    </button>
  );
}
