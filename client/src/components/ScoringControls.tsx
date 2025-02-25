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
  showEditButton: boolean;
  onEditClick: () => void;
  onDeleteClick: () => void;
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
  onDeleteClick
}: ScoringControlsProps) => {
  const noServerSelected = !player1.isServing && !player2.isServing;
  const inExistingPoint = isTimeInExistingPoint(currentVideoTime);
  const invalidEndTime = currentPoint.startTime !== null && currentVideoTime <= currentPoint.startTime;
  const winnerButtonsDisabled = currentPoint.startTime === null || invalidEndTime || inExistingPoint;

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