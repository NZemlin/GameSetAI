import { useEffect, useRef, useState, useCallback } from 'react';
import { Point } from '../types/scoreboard';

interface TimelineEditorProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  startTime: number;
  endTime: number;
  onStartTimeChange: (time: number) => void;
  onEndTimeChange: (time: number) => void;
  maxDuration: number;
  zoomPadding?: number;
  isTimeInExistingPoint: (time: number, excludeIndex?: number) => boolean;
  currentPointIndex: number;
  originalStart: number;
  originalEnd: number;
  points: Point[];
  index: number;
}

const TimelineEditor = ({ 
  videoRef,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  maxDuration,
  zoomPadding = 30,
  isTimeInExistingPoint,
  currentPointIndex,
  originalStart,
  originalEnd,
  points,
  index
}: TimelineEditorProps) => {
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Calculate visible range based on neighboring points
  const calculateVisibleRange = useCallback(() => {
    const prevPoint = points[index - 1];
    const nextPoint = points[index + 1];
    
    const maxStartPadding = prevPoint 
      ? originalStart - (prevPoint.endTime || 0) 
      : originalStart;
    const maxEndPadding = nextPoint 
      ? (nextPoint.startTime || Infinity) - originalEnd 
      : maxDuration - originalEnd;

    const startPadding = Math.min(zoomPadding, maxStartPadding);
    const endPadding = Math.min(zoomPadding, maxEndPadding);

    return {
      visibleStart: Math.max(0, originalStart - startPadding),
      visibleEnd: Math.min(maxDuration, originalEnd + endPadding)
    };
  }, [originalStart, originalEnd, maxDuration, zoomPadding, points, index]);

  const { visibleStart, visibleEnd } = calculateVisibleRange();
  const visibleDuration = visibleEnd - visibleStart;

  const getTimeFromPosition = useCallback((clientX: number): number => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const time = visibleStart + position * visibleDuration;
    return Math.max(0, Math.min(maxDuration, time));
  }, [visibleStart, visibleDuration, maxDuration]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !videoRef.current) return;
    
    const newTime = getTimeFromPosition(e.clientX);
    let updatedTime = newTime;

    // Apply constraints based on which handle is being dragged
    if (dragging === 'start') {
      updatedTime = Math.min(updatedTime, endTime - 0.1);
      updatedTime = Math.max(updatedTime, 0);
      if (!isTimeInExistingPoint(updatedTime, currentPointIndex)) {
        onStartTimeChange(updatedTime);
        videoRef.current.currentTime = updatedTime;
      }
    } else {
      updatedTime = Math.max(updatedTime, startTime + 0.1);
      updatedTime = Math.min(updatedTime, maxDuration);
      if (!isTimeInExistingPoint(updatedTime, currentPointIndex)) {
        onEndTimeChange(updatedTime);
        videoRef.current.currentTime = updatedTime;
      }
    }
  }, [dragging, videoRef, startTime, endTime, maxDuration, isTimeInExistingPoint, currentPointIndex, onStartTimeChange, onEndTimeChange, getTimeFromPosition]);

  const handleMouseUp = () => setDragging(null);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove]);

  const getPositionFromTime = (time: number): number => {
    const rawPosition = ((time - visibleStart) / visibleDuration) * 100;
    return Math.max(0, Math.min(100, rawPosition));
  };

  return (
    <div className="mt-4">
      <div 
        ref={timelineRef}
        className="relative h-8 bg-gray-200 rounded-lg overflow-hidden"
      >
        {/* Timeline markers */}
        <div 
          className="absolute h-full bg-green-100"
          style={{
            left: `${getPositionFromTime(startTime)}%`,
            width: `${getPositionFromTime(endTime) - getPositionFromTime(startTime)}%`
          }}
        />
        
        {/* Start handle */}
        <div
          className="absolute top-0 h-full w-2 bg-green-600 cursor-ew-resize -ml-1"
          style={{ left: `${getPositionFromTime(startTime)}%` }}
          onMouseDown={() => setDragging('start')}
        />
        
        {/* End handle */}
        <div
          className="absolute top-0 h-full w-2 bg-green-600 cursor-ew-resize -ml-1"
          style={{ left: `${getPositionFromTime(endTime)}%` }}
          onMouseDown={() => setDragging('end')}
        />
      </div>
    </div>
  );
};

export default TimelineEditor; 
