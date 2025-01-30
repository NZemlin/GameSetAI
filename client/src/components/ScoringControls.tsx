import { Player, Point } from '../types/scoreboard';
import { getDisplayName } from '../utils/scoreHandlers';

interface ScoringControlsProps {
  player1: Player;
  player2: Player;
  currentPoint: Point;
  onStartPoint: () => void;
  onPointWinner: (winner: 1 | 2) => void;
  currentVideoTime: number;
  isTimeInExistingPoint: (time: number) => boolean;
}

const ScoringControls = ({
  player1,
  player2,
  currentPoint,
  onStartPoint,
  onPointWinner,
  currentVideoTime,
  isTimeInExistingPoint
}: ScoringControlsProps) => {
  const noServerSelected = !player1.isServing && !player2.isServing;
  const inExistingPoint = isTimeInExistingPoint(currentVideoTime);
  const invalidEndTime = currentPoint.startTime !== null && currentVideoTime <= currentPoint.startTime;

  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex justify-between items-center space-x-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={onStartPoint}
            disabled={noServerSelected || inExistingPoint}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm
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
            disabled={!currentPoint.startTime || invalidEndTime || inExistingPoint}
            className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm ${
              !currentPoint.startTime || invalidEndTime || inExistingPoint
                ? 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-indigo-500'
            }`}
          >
            Point {getDisplayName(player1, "Player 1")}
          </button>
          <button
            onClick={() => onPointWinner(2)}
            disabled={!currentPoint.startTime || invalidEndTime || inExistingPoint}
            className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm ${
              !currentPoint.startTime || invalidEndTime || inExistingPoint
                ? 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-indigo-500'
            }`}
          >
            Point {getDisplayName(player2, "Player 2")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScoringControls; 