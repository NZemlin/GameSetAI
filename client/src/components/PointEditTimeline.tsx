import { useRef, useState, useEffect, useCallback } from 'react';
import { Point } from '../types/scoreboard';

interface PointEditTimelineProps {
  point: Point;
  videoDuration: number;
  previousPointEndTime: number | null;
  nextPointStartTime: number | null;
  onStartTimeChange: (time: number) => void;
  onEndTimeChange: (time: number) => void;
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const PointEditTimeline = ({
  point,
  videoDuration,
  previousPointEndTime,
  nextPointStartTime,
  onStartTimeChange,
  onEndTimeChange
}: PointEditTimelineProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);
  
  // IMPORTANT: Keep track of the original point values for bounds calculation
  // These should NEVER change during the editing session
  const [originalPoint] = useState(() => {
    // We'll keep just one log for tracking when a new point edit session begins
    console.log(`[EDIT] Initializing timeline for point: ${point.startTime?.toFixed(2)}-${point.endTime?.toFixed(2)}`);
    return {
      startTime: point.startTime,
      endTime: point.endTime
    };
  });
  
  // Calculate timeline bounds ONCE and never recalculate them
  // Using useState to guarantee fresh bounds for each mounted instance
  const [bounds] = useState(() => {
    // Initialize with the ORIGINAL point's times
    const initialStartTime = originalPoint.startTime ?? 0;
    const initialEndTime = originalPoint.endTime ?? initialStartTime;
    
    // Calculate min bound: 30 seconds before start time, but not before video start or previous point
    const minBound = Math.max(
      0,
      previousPointEndTime ?? 0,
      initialStartTime - 30
    );
    
    // Calculate max bound: 30 seconds after end time, but not after video end or next point
    const maxBound = Math.min(
      videoDuration,
      nextPointStartTime ?? videoDuration,
      initialEndTime + 30
    );
    
    return { minBound, maxBound };
  });
  
  // Slider width in pixels
  const SLIDER_WIDTH = 8;

  // Calculate time range of the visible timeline
  const timelineRange = bounds.maxBound - bounds.minBound;

  // Remove the render logging
  useEffect(() => {
    // We don't need this log anymore
  }, [point.startTime, point.endTime]);
  
  // Memoize the handleMouseMove function to avoid recreating it on every render
  // This ensures it uses the original bounds and doesn't cause re-renders when dragging
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const sliderWidthInTime = (SLIDER_WIDTH / rect.width) * timelineRange;

    // Calculate position in timeline (0-1)
    let position = (e.clientX - rect.left) / rect.width;
    
    // Adjust for the slider width if dragging end handle
    if (dragging === 'end') {
      position = Math.min(1, position + (SLIDER_WIDTH / rect.width));
    }
    
    // Clamp position to valid range
    position = Math.max(0, Math.min(1, position));
    
    // Convert position to time
    const newTime = bounds.minBound + (position * timelineRange);
    
    if (dragging === 'start') {
      // Don't allow start time to go past end time minus slider width
      const maxStartTime = Math.min(
        (point.endTime ?? bounds.maxBound) - sliderWidthInTime, 
        bounds.maxBound
      );
      if (newTime <= maxStartTime) {
        onStartTimeChange(Math.max(bounds.minBound, newTime));
      }
    } else {
      // Don't allow end time to go before start time plus slider width
      const minEndTime = Math.max(
        (point.startTime ?? bounds.minBound) + sliderWidthInTime, 
        bounds.minBound
      );
      if (newTime >= minEndTime) {
        onEndTimeChange(Math.min(bounds.maxBound, newTime));
      }
    }
  }, [dragging, point.startTime, point.endTime, onStartTimeChange, onEndTimeChange, bounds, SLIDER_WIDTH, timelineRange]);

  // Mouse down handler to start dragging
  const handleMouseDown = (type: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(type);
  };

  // Mouse up handler to stop dragging
  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Set up event listeners for dragging
  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Convert time to position percentage within the timeline
  const timeToPosition = (time: number): number => {
    // Clamp time to the bounds
    const clampedTime = Math.max(
      bounds.minBound, 
      Math.min(time, bounds.maxBound)
    );
    
    // Calculate percentage position within the timeline
    return ((clampedTime - bounds.minBound) / timelineRange) * 100;
  };

  // Calculate positions with slider width offset
  const startPosition = timeToPosition(point.startTime ?? bounds.minBound);
  const endPosition = Math.min(
    100 - (SLIDER_WIDTH / (timelineRef.current?.clientWidth ?? 100) * 100),
    timeToPosition(point.endTime ?? bounds.maxBound)
  );

  return (
    <div className="mt-4">
      {/* Bounds labels on top */}
      <div className="flex justify-between text-sm text-gray-500 mb-1">
        <span>{formatTime(bounds.minBound)}</span>
        <span>{formatTime(bounds.maxBound)}</span>
      </div>

      {/* Timeline container */}
      <div
        ref={timelineRef}
        className="relative h-8 bg-gray-200 rounded cursor-pointer"
      >
        {/* Selected region */}
        <div
          className="absolute h-full bg-green-200"
          style={{
            left: `${startPosition}%`,
            width: `${endPosition - startPosition}%`
          }}
        />
        
        {/* Start handle with label */}
        <div className="absolute" style={{ left: `${startPosition}%` }}>
          <div
            className="w-2 h-8 bg-green-600 cursor-ew-resize hover:bg-green-700 rounded-sm"
            onMouseDown={handleMouseDown('start')}
          />
          <div className="absolute -ml-4 mt-1 w-10 text-center">
            <span className="text-xs text-gray-700">{formatTime(point.startTime ?? bounds.minBound)}</span>
          </div>
        </div>
        
        {/* End handle with label */}
        <div className="absolute" style={{ left: `${endPosition}%` }}>
          <div
            className="w-2 h-8 bg-green-600 cursor-ew-resize hover:bg-green-700 rounded-sm"
            onMouseDown={handleMouseDown('end')}
          />
          <div className="absolute -ml-4 mt-1 w-10 text-center">
            <span className="text-xs text-gray-700">{formatTime(point.endTime ?? bounds.maxBound)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PointEditTimeline; 