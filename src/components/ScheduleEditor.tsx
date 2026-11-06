import { useState } from "react";
import type { FormEvent } from "react";
import { formatMinutes, parseTime, type WorkHours } from "../lib/countdown";

interface ScheduleEditorProps {
  hours: WorkHours;
  onSave: (hours: WorkHours) => void;
  onCancel: () => void;
}

export function ScheduleEditor({ hours, onSave, onCancel }: ScheduleEditorProps) {
  const [start, setStart] = useState(() => formatMinutes(hours.start));
  const [end, setEnd] = useState(() => formatMinutes(hours.end));

  const startMinutes = parseTime(start);
  const endMinutes = parseTime(end);
  const invalid = startMinutes === null || endMinutes === null || endMinutes <= startMinutes;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalid) return;
    onSave({ start: startMinutes as number, end: endMinutes as number });
  }

  return (
    <form className="editor" onSubmit={submit}>
      <label className="editor__row">
        <span>上班</span>
        <input
          className="time-input"
          type="time"
          step={60}
          value={start}
          onChange={(event) => setStart(event.target.value)}
        />
      </label>
      <label className="editor__row">
        <span>下班</span>
        <input
          className="time-input"
          type="time"
          step={60}
          value={end}
          onChange={(event) => setEnd(event.target.value)}
        />
      </label>
      <div className="editor__error" role="alert">
        {invalid && start && end ? "下班时间需要晚于上班时间" : ""}
      </div>
      <div className="editor__actions">
        <button type="button" className="ghost-button" onClick={onCancel}>
          取消
        </button>
        <button type="submit" className="primary-button" disabled={invalid}>
          保存
        </button>
      </div>
    </form>
  );
}
