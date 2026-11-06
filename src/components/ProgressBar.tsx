export function ProgressBar({ percent }: { percent: number }) {
  const width = Math.min(100, Math.max(0, percent));
  return (
    <div className="progress" aria-hidden="true">
      <div className="progress__fill" style={{ width: `${width}%` }} />
    </div>
  );
}
