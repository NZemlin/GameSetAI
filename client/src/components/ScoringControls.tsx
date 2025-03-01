import { Player, Point } from '../types/scoreboard';
import { getDisplayName } from '../utils/scoreHandlers';
import { useState, useEffect } from 'react';
import PointEditTimeline from './PointEditTimeline';

interface ScoringControlsProps {
  player1: Player;
  player2: Player;
  currentPoint: Point;
  onStartPoint: () => void;
  onPointWinner: (winner: 1 | 2) => void;
  currentVideoTime: number;
  isTimeInExistingPoint: (time: number, excludeIndex?: number) => boolean;
  showEditButton: boolean;
  onEditClick: () => void;
  onDeleteClick: () => void;
  isEditing: boolean;
  editingPoint: Point | null;
  onSaveEdit: (index: number, updatedPoint: Point) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  points: Point[];
  editingPointIndex: number | null;
}

const ScoringControls = ({
  player1,
  player2,
  currentPoint,
  onStartPoint,
  onPointWinner,
  currentVideoTime,
  isTimeInExistingPoint,
  showEditButton,
  onEditClick,
  onDeleteClick,
  isEditing,
  editingPoint,
  onSaveEdit,
  videoRef,
  points,
  editingPointIndex
}: ScoringControlsProps) => {
  const noServerSelected = !player1.isServing && !player2.isServing;
  const inExistingPoint = isTimeInExistingPoint(currentVideoTime);
  const invalidEndTime = currentPoint.startTime !== null && currentVideoTime <= currentPoint.startTime;
  const winnerButtonsDisabled = currentPoint.startTime === null || invalidEndTime || inExistingPoint;

  // Point editing state
  const [editedStartTime, setEditedStartTime] = useState(0);
  const [editedEndTime, setEditedEndTime] = useState(0);
  const [originalEditPoint, setOriginalEditPoint] = useState<Point | null>(null);
  const [lockedIndex, setLockedIndex] = useState<number | null>(null);
  const [winner, setWinner] = useState<1 | 2 | null>(editingPoint?.winner || null);
  const [errors, setErrors] = useState<string[]>([]);
  const [videoReady, setVideoReady] = useState(false);

  // Update effect to handle video duration updates and winner initialization
  useEffect(() => {
    if (!isEditing || !editingPoint) return;

    // Set winner when editing starts
    setWinner(editingPoint.winner);

    if (!videoRef.current) return;

    const video = videoRef.current;
    const updateDuration = () => {
      const duration = video.duration || 0;
      if (duration > 0) {
        setVideoReady(true);
        setEditedStartTime(Math.min(editingPoint.startTime || 0, duration));
        setEditedEndTime(Math.min(editingPoint.endTime || 0, duration));
      }
    };

    if (video.readyState > 0) {
      updateDuration();
    } else {
      video.addEventListener('loadedmetadata', updateDuration);
    }

    return () => {
      video.removeEventListener('loadedmetadata', updateDuration);
    };
  }, [isEditing, editingPoint, videoRef, setEditedStartTime, setEditedEndTime]);

  useEffect(() => {
    if (editingPoint) {
      // Keep this critical log for when editing begins
      console.log(`[EDIT] Started editing point index ${editingPointIndex}`);
      
      setOriginalEditPoint(editingPoint);
      setLockedIndex(editingPointIndex);
      setEditedStartTime(editingPoint.startTime || 0);
      setEditedEndTime(editingPoint.endTime || 0);
      
      // Set winner when editing starts
      setWinner(editingPoint.winner);
    } else {
      setLockedIndex(null);
    }
  }, [editingPoint, editingPointIndex]);

  const validate = () => {
    const newErrors: string[] = [];
    if (editedStartTime >= editedEndTime) {
      newErrors.push('End time must be after start time');
    }
    if (!winner) {
      newErrors.push('Must select a winner');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = () => {
    if (!editingPoint || !originalEditPoint || !validate()) return;

    // Keep this critical log for when saving edits
    console.log(`[EDIT] Saving point ${lockedIndex}`);

    // Use the locked index directly since we know it's valid
    if (lockedIndex !== null) {
      onSaveEdit(lockedIndex, {
        ...editingPoint,
        startTime: editedStartTime,
        endTime: editedEndTime,
        winner: winner!
      });
    }
    
    setOriginalEditPoint(null);
    setLockedIndex(null);
  };

  if (isEditing && editingPoint) {
    const maxDuration = videoRef.current?.duration || 0;
    
    // Find chronologically adjacent points by time, not by array position
    const otherPoints = points.filter((_, i) => i !== editingPointIndex);
    
    let previousPoint = null;
    let nextPoint = null;
    
    // Find the closest previous point (ends before our start time)
    let maxPreviousEndTime = 0;
    for (const point of otherPoints) {
      if (point.endTime != null && point.endTime <= editedStartTime && point.endTime > maxPreviousEndTime) {
        maxPreviousEndTime = point.endTime;
        previousPoint = point;
      }
    }
    
    // Find the closest next point (starts after our end time)
    let minNextStartTime = Infinity;
    for (const point of otherPoints) {
      if (point.startTime != null && point.startTime >= editedEndTime && point.startTime < minNextStartTime) {
        minNextStartTime = point.startTime;
        nextPoint = point;
      }
    }
    
    // Create wrapper functions but remove excessive logging
    const handleStartTimeChange = (time: number) => {
      // Only log significant changes (optional)
      setEditedStartTime(time);
    };

    const handleEndTimeChange = (time: number) => {
      // Only log significant changes (optional)
      setEditedEndTime(time);
    };

    return (
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium mb-4">Edit Point</h3>
        
        {errors.length > 0 && (
          <div className="mb-4 text-red-600">
            {errors.map((e, i) => <div key={i}>• {e}</div>)}
          </div>
        )}

        {videoReady && maxDuration > 0 ? (
          <PointEditTimeline
            key={`point-edit-timeline-${editingPointIndex}-${editingPoint.startTime}-${editingPoint.endTime}`}
            point={{
              ...editingPoint,
              startTime: editedStartTime,
              endTime: editedEndTime
            }}
            videoDuration={maxDuration}
            previousPointEndTime={previousPoint?.endTime ?? null}
            nextPointStartTime={nextPoint?.startTime ?? null}
            onStartTimeChange={handleStartTimeChange}
            onEndTimeChange={handleEndTimeChange}
          />
        ) : (
          <div className="mt-4 text-gray-500">Loading video duration...</div>
        )}

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Winner</label>
            <select
              value={winner || ''}
              onChange={(e) => setWinner(parseInt(e.target.value) as 1 | 2)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
            >
              <option value="">Select Winner</option>
              <option value="1">{getDisplayName(player1, "Player 1")}</option>
              <option value="2">{getDisplayName(player2, "Player 2")}</option>
            </select>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-gray-200 h-[72px] flex items-center">
      <div className="flex justify-between items-center space-x-4 w-full">
        {showEditButton ? (
          <div className="flex gap-2">
            <button
              onClick={onEditClick}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-indigo-500 text-sm font-medium rounded-md shadow-sm"
            >
              <svg className="w-4 h-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Edit Point
            </button>
            <button
              onClick={onDeleteClick}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-red-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-red-500 text-sm font-medium rounded-md shadow-sm"
            >
              <svg className="w-4 h-4 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Delete Point
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center">
              <button
                onClick={onStartPoint}
                disabled={noServerSelected || inExistingPoint}
                className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm
                  ${noServerSelected || inExistingPoint
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                  }`}
              >
                Point Start
              </button>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onPointWinner(1)}
                disabled={winnerButtonsDisabled}
                className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm
                  ${winnerButtonsDisabled
                    ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                    : 'border-gray-300 text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-indigo-500'
                  }`}
              >
                Point {getDisplayName(player1, "Player 1")}
              </button>
              <button
                onClick={() => onPointWinner(2)}
                disabled={winnerButtonsDisabled}
                className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm
                  ${winnerButtonsDisabled
                    ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                    : 'border-gray-300 text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-indigo-500'
                  }`}
              >
                Point {getDisplayName(player2, "Player 2")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ScoringControls; 