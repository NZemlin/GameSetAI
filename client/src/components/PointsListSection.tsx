import { Player, MatchConfig, ChronologicalPoints } from '../types/scoreboard';
import PointsList from './PointsList';

interface PointsListSectionProps {
  expanded: boolean;
  onExpandToggle: () => void;
  chronologicalPoints: ChronologicalPoints;
  player1: Player;
  player2: Player;
  scrollToIndex?: number;
  matchConfig: MatchConfig;
  onScrollComplete: () => void;
}

const PointsListSection = ({
  expanded,
  onExpandToggle,
  chronologicalPoints,
  player1,
  player2,
  scrollToIndex,
  matchConfig,
  onScrollComplete
}: PointsListSectionProps) => {
  return (
    <div className="bg-white rounded-lg mt-4" style={{ boxShadow: '0 0 15px rgba(0, 0, 0, 0.1)' }}>
      <button
        onClick={onExpandToggle}
        className="w-full px-2 py-0.5 flex items-center justify-center text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none"
      >
        {expanded ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </button>
      {expanded && (
        <div 
          className="overflow-y-scroll scrollbar-thin scrollbar-thumb-indigo-200 hover:scrollbar-thumb-indigo-300 scrollbar-track-transparent pr-2"
          style={{ height: 'calc(100vh - 700px)' }}
        >
          <PointsList
            points={chronologicalPoints.points}
            player1={player1}
            player2={player2}
            showInitialServer={true}
            scrollToIndex={scrollToIndex}
            matchConfig={matchConfig}
            onScrollComplete={onScrollComplete}
          />
        </div>
      )}
    </div>
  );
};

export default PointsListSection; 