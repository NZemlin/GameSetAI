import { useEffect, useRef, useState } from 'react';
import { Point } from '../types/scoreboard';

interface VideoTimelineProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  points: Point[];
  onSeek: (time: number) => void;
}

const VideoTimeline = ({ videoRef, points, onSeek }: VideoTimelineProps) => {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let timeoutId: NodeJS.Timeout;
    const handleTimeUpdate = () => {
      // Debounce the setProgress update
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setProgress((video.currentTime / video.duration) * 100);
      }, 100); // Update progress every 100ms
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      clearTimeout(timeoutId);
    };
  }, [videoRef]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !videoRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const clickPosition = e.clientX - rect.left;
    const percentage = clickPosition / rect.width;
    const newTime = percentage * duration;

    onSeek(newTime);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full px-4 py-2">
      <div className="relative">
        {/* Timeline bar */}
        <div
          ref={timelineRef}
          className="h-2 bg-gray-200 rounded cursor-pointer relative overflow-hidden"
          onClick={handleTimelineClick}
        >
          {/* Progress bar */}
          <div
            className="absolute h-full bg-green-200 rounded"
            style={{ width: `${progress}%` }}
          />

          {/* Point markers */}
          {points.map((point, index) => {
            if (!point.startTime || !point.endTime) return null;
            const startPosition = (point.startTime / duration) * 100;
            const endPosition = (point.endTime / duration) * 100;
            const width = endPosition - startPosition;
            
            return (
              <div
                key={index}
                className="absolute h-full bg-green-500 hover:bg-green-600 cursor-pointer group"
                style={{ 
                  left: `${startPosition}%`,
                  width: `${width}%`
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek(point.startTime!);
                }}
                title={`Point ${index + 1} (${formatTime(point.startTime)} - ${formatTime(point.endTime)})`}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  Point {index + 1} ({formatTime(point.startTime)} - {formatTime(point.endTime)})
                </div>
              </div>
            );
          })}
        </div>

        {/* Time display */}
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>{formatTime(videoRef.current?.currentTime || 0)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default VideoTimeline;