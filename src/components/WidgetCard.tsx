import { WidgetHeader } from "./WidgetHeader";
import { TimerFace } from "./TimerFace";
import { ProgressBar } from "./ProgressBar";
import { ScheduleEditor } from "./ScheduleEditor";
import { PencilIcon, SparkleIcon } from "./icons";
import type { DragHandlers } from "../hooks/useWindowDrag";
import type { Phase, WorkHours } from "../lib/countdown";
import type { OvertimeMessage } from "../lib/praise";

interface WidgetCardProps {
  phase: Phase;
  value: string;
  label: string;
  percent: number | null;
  scheduleText: string;
  hours: WorkHours;
  editing: boolean;
  overtime: OvertimeMessage | null;
  drag: DragHandlers;
  onCollapse: () => void;
  onDoubleClick: () => void;
  onEdit: () => void;
  onSave: (hours: WorkHours) => void;
  onCancel: () => void;
}

export function WidgetCard({
  phase,
  value,
  label,
  percent,
  scheduleText,
  hours,
  editing,
  overtime,
  drag,
  onCollapse,
  onDoubleClick,
  onEdit,
  onSave,
  onCancel,
}: WidgetCardProps) {
  return (
    <section
      className={`widget phase-${phase}`}
      role="timer"
      aria-label={`下班倒计时 ${label} ${value}`}
      aria-live="off"
    >
      <WidgetHeader drag={drag} onCollapse={onCollapse} onDoubleClick={onDoubleClick} />
      {editing ? (
        <ScheduleEditor hours={hours} onSave={onSave} onCancel={onCancel} />
      ) : (
        <>
          <TimerFace value={value} label={label} percent={percent} />
          {percent !== null ? <ProgressBar percent={percent} /> : <div className="progress-spacer" />}
          {overtime ? (
            <div className="praise" key={overtime.bucket}>
              <span className="praise__title">
                <SparkleIcon />
                {overtime.title}
              </span>
              <span className="praise__note">{overtime.note}</span>
            </div>
          ) : null}
          <button type="button" className="schedule" onClick={onEdit} title="修改上下班时间">
            <span>{scheduleText}</span>
            <PencilIcon />
          </button>
        </>
      )}
    </section>
  );
}
