import { useState, useRef, useEffect } from 'react';
import { Player, MatchConfig, ChronologicalPoints } from '../types/scoreboard';
import PointsList from './PointsList';

interface PointsListSectionProps {
  expanded: boolean;
  onExpandToggle: () => void;
  chronologicalPoints: ChronologicalPoints;
  player1: Player;
  player2: Player;
  scrollToIndex?: number;
  setScrollToIndex: (index: number | undefined) => void;
  matchConfig: MatchConfig;
  onScrollComplete: () => void;
  onSeek: (time: number) => void;
  isVideoPaused: boolean;
  currentVideoTime: number;
}

const PointsListSection = ({
  expanded,
  onExpandToggle,
  chronologicalPoints,
  player1,
  player2,
  scrollToIndex,
  setScrollToIndex,
  matchConfig,
  onScrollComplete,
  onSeek,
  isVideoPaused,
  currentVideoTime
}: PointsListSectionProps) => {
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect
  useEffect(() => {
    if (!autoScrollEnabled || isVideoPaused) return;

    const currentPointIndex = chronologicalPoints.points.findIndex(point => 
      point.startTime !== null &&
      point.endTime !== null &&
      currentVideoTime >= point.startTime &&
      currentVideoTime <= point.endTime
    );

    if (currentPointIndex > -1) {
      setScrollToIndex(currentPointIndex);
    }
  }, [currentVideoTime, chronologicalPoints.points, autoScrollEnabled, isVideoPaused, setScrollToIndex]);

  return (
    <div className="bg-white rounded-lg mt-4" style={{ boxShadow: '0 0 15px rgba(0, 0, 0, 0.1)' }}>
      <button
        onClick={onExpandToggle}
        className="w-full px-2 py-0.5 flex items-center justify-center text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none relative"
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
        {expanded && !isVideoPaused && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setAutoScrollEnabled(!autoScrollEnabled);
            }}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm rounded-md p-0.5 text-gray-500 shadow-sm ring-1 ring-gray-200/50 cursor-pointer hover:bg-white hover:text-gray-600 transition-colors flex items-center gap-1.5 focus:outline-none"
            title={autoScrollEnabled ? "Disable auto-scroll" : "Enable auto-scroll"}
          >
            <svg className="h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              {autoScrollEnabled ? (
                // Locked
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              ) : (
                // Unlocked
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              )}
            </svg>
          </button>
        )}
      </button>
      {expanded && (
        <div className="relative">
          <div 
            ref={listRef}
            className="overflow-y-scroll scrollbar-thin scrollbar-thumb-indigo-200 hover:scrollbar-thumb-indigo-300 scrollbar-track-transparent"
            style={{ height: 'calc(100vh - 700px)' }}
          >
            <PointsList
              points={chronologicalPoints.points}
              player1={player1}
              player2={player2}
              showInitialServer={true}
              scrollToIndex={autoScrollEnabled ? scrollToIndex : undefined}
              matchConfig={matchConfig}
              onScrollComplete={onScrollComplete}
              onSeek={onSeek}
              isAutoScrolling={{ current: autoScrollEnabled }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PointsListSection; 