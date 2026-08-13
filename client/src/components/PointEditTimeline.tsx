import { useCallback, useEffect, useRef, useState } from 'react';
import { formatClock } from '../lib/time';

interface Props {
  startTime: number;
  endTime: number;
  videoDuration: number;
  previousEnd: number | null;
  nextStart: number | null;
  onStartChange: (time: number) => void;
  onEndChange: (time: number) => void;
  onSeek: (time: number) => void;
}

export default function PointEditTimeline({
  startTime,
  endTime,
  videoDuration,
  previousEnd,
  nextStart,
  onStartChange,
  onEndChange,
  onSeek,
}: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<'start' | 'end' | null>(null);
  const [bounds] = useState(() => ({
    min: Math.max(0, previousEnd ?? 0, startTime - 30),
    max: Math.min(videoDuration, nextStart ?? videoDuration, endTime + 30),
  }));
  const range = Math.max(0.001, bounds.max - bounds.min);

  const toTime = useCallback(
    (clientX: number) => {
      const rect = barRef.current?.getBoundingClientRect();
      if (!rect) return startTime;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return bounds.min + ratio * range;
    },
    [bounds.min, range, startTime]
  );

  useEffect(() => {
    if (!drag) return;
    const move = (event: MouseEvent) => {
      const time = toTime(event.clientX);
      if (drag === 'start') {
        const next = Math.min(time, endTime - 0.05);
        onStartChange(next);
        onSeek(next);
      } else {
        const next = Math.max(time, startTime + 0.05);
        onEndChange(next);
        onSeek(next);
      }
    };
    const up = () => setDrag(null);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [drag, endTime, onEndChange, onSeek, onStartChange, startTime, toTime]);

  const startPct = ((startTime - bounds.min) / range) * 100;
  const endPct = ((endTime - bounds.min) / range) * 100;

  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between text-xs text-gray-500">
        <span>{formatClock(bounds.min)}</span>
        <span>{formatClock(bounds.max)}</span>
      </div>
      <div ref={barRef} className="relative h-8 rounded bg-gray-200">
        <div
          className="absolute inset-y-0 rounded-sm bg-indigo-200"
          style={{ left: `${startPct}%`, width: `${Math.max(endPct - startPct, 1)}%` }}
        />
        <Handle
          left={startPct}
          label={formatClock(startTime)}
          onDown={() => {
            setDrag('start');
            onSeek(startTime);
          }}
        />
        <Handle
          left={endPct}
          label={formatClock(endTime)}
          onDown={() => {
            setDrag('end');
            onSeek(endTime);
          }}
        />
      </div>
    </div>
  );
}

function Handle({ left, label, onDown }: { left: number; label: string; onDown: () => void }) {
  return (
    <div className="absolute top-0" style={{ left: `${left}%` }}>
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          onDown();
        }}
        className="-ml-1 h-8 w-2 cursor-ew-resize rounded-sm bg-indigo-600 hover:bg-indigo-700"
        aria-label={label}
      />
      <div className="-ml-5 mt-1 w-10 text-center text-[10px] text-gray-600">{label}</div>
    </div>
  );
}
