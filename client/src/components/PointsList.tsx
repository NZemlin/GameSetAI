import { useEffect, useRef } from 'react';
import { Point, Player, MatchConfig } from '../types/scoreboard';
import { getDisplayName } from '../utils/scoreHandlers';

interface PointsListProps {
  points: Point[];
  player1: Player;
  player2: Player;
  showInitialServer?: boolean;
  scrollToIndex?: number;
  matchConfig: MatchConfig;
  onScrollComplete?: () => void;
}

const formatTime = (time: number): string => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const PointsList = ({ points, player1, player2, showInitialServer = false, scrollToIndex, matchConfig, onScrollComplete }: PointsListProps) => {
  const pointRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollToIndex !== undefined && pointRefs.current[scrollToIndex] && containerRef.current) {
      const element = pointRefs.current[scrollToIndex];
      const container = containerRef.current.parentElement;
      if (!container) return;
      
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Calculate how far the element is from being centered in the viewport
      const elementCenter = elementRect.top + (elementRect.height / 2);
      const containerCenter = containerRect.top + (containerRect.height / 2);
      const offset = elementCenter - containerCenter;
      
      // Add the offset to the current scroll position
      const newScrollTop = container.scrollTop + offset;
      
      container.scrollTo({
        top: newScrollTop,
        behavior: 'smooth'
      });

      // Clear scroll index after animation completes
      const timeout = setTimeout(() => {
        onScrollComplete?.();
      }, 1000); // Smooth scroll typically takes ~1s

      return () => clearTimeout(timeout);
    }
  }, [scrollToIndex, onScrollComplete]);

  const getOrdinalSet = (index: number): string => {
    switch (index) {
      case 0: return 'first';
      case 1: return 'second';
      case 2: return 'third';
      case 3: return 'fourth';
      case 4: return 'fifth';
      default: return `${index + 1}th`; // Should never happen in tennis
    }
  };

  const renderInitialServer = (matchConfig: MatchConfig) => {
    if (!showInitialServer) return null;
    
    const firstServer = matchConfig.firstServer === 1 ? player1 : player2;
    return (
      <div key="match-start" className="py-3 bg-indigo-100 text-center">
        <div className="text-sm font-medium text-gray-900">
          {getDisplayName(firstServer, firstServer === player1 ? "Player 1" : "Player 2")} starts the match
        </div>
      </div>
    );
  };

  const renderPointItem = (point: Point, index: number) => {
    const currentState = point.scoreState;
    if (!currentState) return null;

    const elements: JSX.Element[] = [];
    
    // Add the point entry
    elements.push(
      <div 
        key={`point-${index}`} 
        ref={el => pointRefs.current[index] = el}
        className="py-2 px-4 flex justify-between items-center hover:bg-gray-50"
      >
        <div className="text-sm text-gray-500">
          {formatTime(point.startTime!)} - {formatTime(point.endTime!)}
        </div>
        <div className="text-sm font-medium text-gray-900">
          Point to {getDisplayName(point.winner === 1 ? player1 : player2, point.winner === 1 ? "Player 1" : "Player 2")}
        </div>
      </div>
    );

    // Add dividers based on point.divider type
    if (point.divider) {
      const winner = point.winner === 1 ? player1 : player2;
      switch (point.divider) {
        case 'set': {
          const setIndex = currentState.player1.completedSets.length - 1;
          const winnerScore = currentState[winner === player1 ? 'player1' : 'player2'].completedSets[setIndex].score;
          const loserScore = currentState[winner === player1 ? 'player2' : 'player1'].completedSets[setIndex].score;

          elements.push(
            <div key={`set-${index}`} className="py-3 bg-indigo-50 text-center">
              <div className="text-sm font-medium text-gray-900">
                {getDisplayName(winner, winner === player1 ? "Player 1" : "Player 2")} takes the {getOrdinalSet(setIndex)} {matchConfig.type === 'match' ? 'set' : 'tiebreak'}
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {winnerScore}-{loserScore}
                {matchConfig.type === 'match' && currentState.inTiebreak && ` (${currentState.player1.currentGame}-${currentState.player2.currentGame})`}
              </div>
            </div>
          );
          break;
        }
        case 'tiebreak': {
          const tiebreakIndex = currentState.player1.completedSets.length - 1;
          const winnerScore = currentState[winner === player1 ? 'player1' : 'player2'].completedSets[tiebreakIndex].score;
          const loserScore = currentState[winner === player1 ? 'player2' : 'player1'].completedSets[tiebreakIndex].score;
          const prevTiebreakWins = points.slice(0, index).filter(p => p.divider === 'tiebreak').length;
          
          elements.push(
            <div key={`tiebreak-win-${index}`} className="py-3 bg-indigo-50 text-center">
              <div className="text-sm font-medium text-gray-900">
                {getDisplayName(winner, winner === player1 ? "Player 1" : "Player 2")} wins the {getOrdinalSet(prevTiebreakWins)} tiebreak
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {winnerScore}-{loserScore}
              </div>
            </div>
          );
          break;
        }
        case 'tiebreak-start': {
          const currentSetIndex = currentState.player1.completedSets.length;
          const server = currentState.player1.isServing ? player1 : player2;
          elements.push(
            <div key={`tiebreak-${index}`} className="py-3 bg-indigo-50/75 text-center">
              <div className="text-sm font-medium text-gray-900">
                {getDisplayName(server, server === player1 ? "Player 1" : "Player 2")} starts the {getOrdinalSet(currentSetIndex)} set tiebreak
              </div>
            </div>
          );
          break;
        }
        case 'game': {
          const nextServer = currentState.player1.isServing ? player1 : player2;
          const isPlayer2Server = nextServer === player2;
          const p1Set = currentState.player1.currentSet;
          const p2Set = currentState.player2.currentSet;
          
          elements.push(
            <div key={`game-${index}`} className="py-2 bg-indigo-50/50 text-center">
              <div className="text-sm text-gray-700">
                {getDisplayName(nextServer, nextServer === player1 ? "Player 1" : "Player 2")} to serve
              </div>
              <div className="text-sm font-medium text-gray-900">
                {isPlayer2Server ? p2Set : p1Set}-{isPlayer2Server ? p1Set : p2Set}
              </div>
            </div>
          );
          break;
        }
      }
    }

    return elements;
  };

  return (
    <div ref={containerRef} className="divide-y divide-gray-200">
      {renderInitialServer(matchConfig)}
      {points.map((point, index) => renderPointItem(point, index))}
    </div>
  );
};

export default PointsList; 