import { useEffect, useRef, useState } from 'react';
import type { Point } from '@gamesetai/scoring';
import { formatClock } from '../lib/time';

interface Props {
  video: HTMLVideoElement | null;
  points: Point[];
  pendingStart: number | null;
  activeIndex: number | null;
  onSeek: (time: number) => void;
}

export default function Timeline({ video, points, pendingStart, activeIndex, onSeek }: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hover, setHover] = useState<{ x: number; time: number } | null>(null);

  useEffect(() => {
    if (!video) return;
    const onTime = () => setNow(video.currentTime);
    const onMeta = () => setDuration(video.duration || 0);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('seeked', onTime);
    video.addEventListener('loadedmetadata', onMeta);
    onMeta();
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('seeked', onTime);
      video.removeEventListener('loadedmetadata', onMeta);
    };
  }, [video]);

  const timeFromEvent = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current || !duration) return 0;
    const rect = barRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(duration, ((event.clientX - rect.left) / rect.width) * duration));
  };

  return (
    <div className="mt-3 px-4">
      <div
        ref={barRef}
        onClick={(event) => onSeek(timeFromEvent(event))}
        onMouseMove={(event) => {
          if (!barRef.current) return;
          const rect = barRef.current.getBoundingClientRect();
          setHover({ x: event.clientX - rect.left, time: timeFromEvent(event) });
        }}
        onMouseLeave={() => setHover(null)}
        className="relative h-4 cursor-pointer overflow-hidden rounded bg-gray-200"
      >
        <div
          className="absolute inset-y-0 left-0 bg-indigo-100"
          style={{ width: duration ? `${(now / duration) * 100}%` : '0%' }}
        />
        {pendingStart !== null && duration > 0 && (
          <div
            className="absolute inset-y-0 bg-amber-300/70"
            style={{
              left: `${(pendingStart / duration) * 100}%`,
              width: `${(Math.max(now - pendingStart, 0) / duration) * 100}%`,
            }}
          />
        )}
        {points.map((point, index) => {
          if (!duration) return null;
          const left = (point.startTime / duration) * 100;
          const width = ((point.endTime - point.startTime) / duration) * 100;
          const active = activeIndex === index;
          return (
            <button
              key={`${point.startTime}-${index}`}
              type="button"
              title={`Point ${index + 1} · ${formatClock(point.startTime)}–${formatClock(point.endTime)}`}
              onClick={(event) => {
                event.stopPropagation();
                onSeek(point.startTime);
              }}
              className={`absolute inset-y-0 ${
                active ? 'z-10 bg-amber-400' : 'bg-indigo-500 hover:bg-indigo-600'
              }`}
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
        {duration > 0 && (
          <div
            className="absolute inset-y-0 w-0.5 bg-slate-900"
            style={{ left: `${(now / duration) * 100}%` }}
          />
        )}
        {hover && (
          <div
            className="pointer-events-none absolute -top-6 -translate-x-1/2 rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-white"
            style={{ left: hover.x }}
          >
            {formatClock(hover.time)}
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-between text-xs text-gray-500">
        <span>{formatClock(now)}</span>
        <span>{formatClock(duration)}</span>
      </div>
    </div>
  );
}
