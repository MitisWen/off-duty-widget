interface TimerFaceProps {
  value: string;
  label: string;
  percent: number | null;
}

export function TimerFace({ value, label, percent }: TimerFaceProps) {
  return (
    <div className="timer">
      <div className="timer__value">{value}</div>
      <div className="timer__meta">
        <span className="timer__label">{label}</span>
        {percent !== null ? <span className="timer__percent">{percent}%</span> : null}
      </div>
    </div>
  );
}
