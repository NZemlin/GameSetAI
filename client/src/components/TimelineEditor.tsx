import { useEffect, useRef, useState, useCallback } from 'react';
import { Point } from '../types/scoreboard';

interface TimelineEditorProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  startTime: number;
  endTime: number;
  onStartTimeChange: (time: number) => void;
  onEndTimeChange: (time: number) => void;
  maxDuration: number;
  points: Point[];
  index: number;
  isTimeInExistingPoint: (time: number, excludeIndex?: number) => boolean;
}

const TimelineEditor = ({ 
  videoRef,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  maxDuration,
  points,
  index,
  isTimeInExistingPoint
}: TimelineEditorProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);
  
  // Padding for zoomed view in seconds
  const zoomPadding = 30;

  // Calculate bounds immediately and store in state that won't change during this component's lifecycle
  // This guarantees fresh bounds for each mounted instance
  const [bounds] = useState(() => {
    // Only log when bounds are first calculated for this point
    console.log(`[BOUNDS] Calculating for point ${index} at ${new Date().toLocaleTimeString()}`);

    // Find the chronologically closest previous and next points by time
    const otherPoints = points.filter((_, i) => i !== index);
    
    let previousPoint = null;
    let nextPoint = null;
    
    // Find the closest previous point (ends before our start time)
    let maxPreviousEndTime = 0;
    for (const point of otherPoints) {
      if (point.endTime != null && point.endTime <= startTime && point.endTime > maxPreviousEndTime) {
        maxPreviousEndTime = point.endTime;
        previousPoint = point;
      }
    }
    
    // Find the closest next point (starts after our end time)
    let minNextStartTime = Infinity;
    for (const point of otherPoints) {
      if (point.startTime != null && point.startTime >= endTime && point.startTime < minNextStartTime) {
        minNextStartTime = point.startTime;
        nextPoint = point;
      }
    }

    // Calculate the minimum boundary (start of visible timeline)
    const minBound = Math.max(
      0, // Video start
      previousPoint?.endTime ?? 0, // Previous point end
      startTime - zoomPadding // 30 seconds before current point start
    );
    
    // Calculate the maximum boundary (end of visible timeline)
    const maxBound = Math.min(
      maxDuration, // Video end
      nextPoint?.startTime ?? maxDuration, // Next point start
      endTime + zoomPadding // 30 seconds after current point end
    );
    
    console.log(`[BOUNDS] For point ${index}: min=${minBound.toFixed(2)}, max=${maxBound.toFixed(2)}, range=${(maxBound-minBound).toFixed(2)}s`);
    console.log(`[BOUNDS] Previous point: ${previousPoint ? `${previousPoint.startTime?.toFixed(2)}-${previousPoint.endTime?.toFixed(2)}` : 'none'}`);
    console.log(`[BOUNDS] Next point: ${nextPoint ? `${nextPoint.startTime?.toFixed(2)}-${nextPoint.endTime?.toFixed(2)}` : 'none'}`);
    
    return { minBound, maxBound };
  });

  // Calculate visible time range once
  const timelineRange = bounds.maxBound - bounds.minBound;

  // Convert time to position percentage
  const getPositionFromTime = useCallback((time: number): number => {
    // Clamp time to bounds
    const clampedTime = Math.max(
      bounds.minBound, 
      Math.min(time, bounds.maxBound)
    );
    
    // Convert to percentage position
    return ((clampedTime - bounds.minBound) / timelineRange) * 100;
  }, [bounds, timelineRange]);

  // Convert position to time
  const getTimeFromPosition = useCallback((clientX: number): number => {
    if (!timelineRef.current) return 0;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const position = (clientX - rect.left) / rect.width;
    const clampedPosition = Math.max(0, Math.min(1, position));
    
    return bounds.minBound + clampedPosition * timelineRange;
  }, [bounds, timelineRange]);

  // Handle mouse movement during drag
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !videoRef.current) return;
    
    const newTime = getTimeFromPosition(e.clientX);
    
    if (dragging === 'start') {
      // Don't allow start to go past end time
      const validTime = Math.min(newTime, endTime - 0.1);
      
      // Check if time overlaps with another point
      if (!isTimeInExistingPoint(validTime, index)) {
        onStartTimeChange(validTime);
        videoRef.current.currentTime = validTime;
      }
    } else { // dragging === 'end'
      // Don't allow end to go before start time
      const validTime = Math.max(newTime, startTime + 0.1);
      
      // Check if time overlaps with another point
      if (!isTimeInExistingPoint(validTime, index)) {
        onEndTimeChange(validTime);
        videoRef.current.currentTime = validTime;
      }
    }
  }, [dragging, videoRef, startTime, endTime, getTimeFromPosition, isTimeInExistingPoint, index, onStartTimeChange, onEndTimeChange]);

  // Handle start of drag
  const handleMouseDown = (type: 'start' | 'end') => {
    setDragging(type);
  };

  // Handle end of drag
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

  // Format time as MM:SS
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate positions for the handles and selected region
  const startPosition = getPositionFromTime(startTime);
  const endPosition = getPositionFromTime(endTime);

  return (
    <div className="mt-4">
      {/* Timeline bounds labels */}
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{formatTime(bounds.minBound)}</span>
        <span>{formatTime(bounds.maxBound)}</span>
      </div>

      {/* Timeline container */}
      <div
        ref={timelineRef}
        className="relative h-8 bg-gray-200 rounded-lg overflow-hidden"
      >
        {/* Selected region */}
        <div 
          className="absolute h-full bg-green-100"
          style={{
            left: `${startPosition}%`,
            width: `${endPosition - startPosition}%`
          }}
        />
        
        {/* Start handle */}
        <div
          className="absolute top-0 h-full w-2 bg-green-600 cursor-ew-resize -ml-1 group"
          style={{ left: `${startPosition}%` }}
          onMouseDown={() => handleMouseDown('start')}
        >
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap text-xs bg-gray-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(startTime)}
          </div>
        </div>
        
        {/* End handle */}
        <div
          className="absolute top-0 h-full w-2 bg-green-600 cursor-ew-resize -ml-1 group"
          style={{ left: `${endPosition}%` }}
          onMouseDown={() => handleMouseDown('end')}
        >
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap text-xs bg-gray-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(endTime)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineEditor; 
