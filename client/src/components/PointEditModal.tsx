import { useState } from 'react';
import { Point } from '../types/scoreboard';
import TimelineEditor from './TimelineEditor';

interface PointEditModalProps {
  point: Point;
  index: number;
  onClose: () => void;
  onSave: (index: number, updatedPoint: Point) => void;
  onDelete: (index: number) => void;
  isTimeInExistingPoint: (time: number, excludeIndex?: number) => boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  points: Point[];
}

const formatTimeToMinSec = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(2);
  return `${minutes}:${remainingSeconds.padStart(5, '0')}`;
};

const parseMinSecToSeconds = (timeStr: string): number => {
  const [minutes, seconds] = timeStr.split(':').map(parseFloat);
  return minutes * 60 + seconds;
};

const PointEditModal = ({ 
  point,
  index,
  onClose,
  onSave,
  onDelete,
  isTimeInExistingPoint,
  videoRef,
  points
}: PointEditModalProps) => {
  const [startTime, setStartTime] = useState(point.startTime?.toFixed(2) || '');
  const [endTime, setEndTime] = useState(point.endTime?.toFixed(2) || '');
  const [winner, setWinner] = useState<1 | 2 | null>(point.winner);
  const [errors, setErrors] = useState<string[]>([]);
  const [originalStart] = useState(point.startTime || 0);
  const [originalEnd] = useState(point.endTime || 0);

  const validate = () => {
    const newErrors: string[] = [];
    const start = parseFloat(startTime);
    const end = parseFloat(endTime);

    if (isNaN(start) || isNaN(end)) {
      newErrors.push('Times must be valid numbers');
    }
    if (start >= end) {
      newErrors.push('End time must be after start time');
    }
    if (!winner) {
      newErrors.push('Must select a winner');
    }
    
    // Check for overlaps excluding current point
    if (isTimeInExistingPoint(start, index) || isTimeInExistingPoint(end, index)) {
      newErrors.push('Times overlap with existing points');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(index, {
        ...point,
        startTime: parseFloat(startTime),
        endTime: parseFloat(endTime),
        winner: winner!
      });
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 bg-black bg-opacity-50 flex items-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-[500px] shadow-xl">
        <h3 className="text-lg font-medium mb-4">Edit Point</h3>
        
        {errors.length > 0 && (
          <div className="mb-4 text-red-600">
            {errors.map((e, i) => <div key={i}>• {e}</div>)}
          </div>
        )}

        <TimelineEditor
          videoRef={videoRef}
          startTime={parseFloat(startTime)}
          endTime={parseFloat(endTime)}
          onStartTimeChange={(time) => setStartTime(time.toFixed(2))}
          onEndTimeChange={(time) => setEndTime(time.toFixed(2))}
          maxDuration={videoRef.current?.duration || 0}
          isTimeInExistingPoint={isTimeInExistingPoint}
          currentPointIndex={index}
          originalStart={originalStart}
          originalEnd={originalEnd}
          points={points}
          index={index}
        />

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="text"
                value={formatTimeToMinSec(parseFloat(startTime))}
                onChange={(e) => {
                  try {
                    const seconds = parseMinSecToSeconds(e.target.value);
                    if (!isNaN(seconds)) {
                      setStartTime(seconds.toFixed(2));
                    }
                  } catch {
                    // Invalid format, ignore
                  }
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="text"
                value={formatTimeToMinSec(parseFloat(endTime))}
                onChange={(e) => {
                  try {
                    const seconds = parseMinSecToSeconds(e.target.value);
                    if (!isNaN(seconds)) {
                      setEndTime(seconds.toFixed(2));
                    }
                  } catch {
                    // Invalid format, ignore
                  }
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Winner</label>
            <select
              value={winner || ''}
              onChange={(e) => setWinner(parseInt(e.target.value) as 1 | 2)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
            >
              <option value="">Select Winner</option>
              <option value="1">Player 1</option>
              <option value="2">Player 2</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <button
            onClick={() => onDelete(index)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Delete Point
          </button>
          <div className="space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-900 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PointEditModal; 