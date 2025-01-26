import { useState } from 'react';
import { Player, MatchConfig, Point, ChronologicalPoints } from '../types/scoreboard';

export const useScoreboardState = (onPlayerNamesChange?: (player1Name: string, player2Name: string) => void) => {
  const [player1, setPlayer1] = useState<Player>({
    name: '',
    completedSets: [],
    currentSet: 0,
    currentGame: 0,
    isServing: false
  });

  const [player2, setPlayer2] = useState<Player>({
    name: '',
    completedSets: [],
    currentSet: 0,
    currentGame: 0,
    isServing: false
  });

  const [matchConfig, setMatchConfig] = useState<MatchConfig>({
    type: 'match',
    tiebreakPoints: 7,
    noAd: false,
    inTiebreak: false,
    firstServer: null
  });

  const [scoringStarted, setScoringStarted] = useState(false);
  const [pointsListExpanded, setPointsListExpanded] = useState(true);
  const [chronologicalPoints, setChronologicalPoints] = useState<ChronologicalPoints>({
    points: [],
    currentIndex: -1
  });

  const [currentPoint, setCurrentPoint] = useState<Point>({
    startTime: null,
    endTime: null,
    winner: null
  });

  const [scrollToIndex, setScrollToIndex] = useState<number | undefined>(undefined);

  const handleNameChange = (playerNum: 1 | 2, name: string) => {
    if (playerNum === 1) {
      setPlayer1(prev => ({ ...prev, name }));
    } else {
      setPlayer2(prev => ({ ...prev, name }));
    }
    onPlayerNamesChange?.(
      playerNum === 1 ? name : player1.name,
      playerNum === 2 ? name : player2.name
    );
  };

  return {
    player1,
    setPlayer1,
    player2,
    setPlayer2,
    matchConfig,
    setMatchConfig,
    scoringStarted,
    setScoringStarted,
    pointsListExpanded,
    setPointsListExpanded,
    chronologicalPoints,
    setChronologicalPoints,
    currentPoint,
    setCurrentPoint,
    scrollToIndex,
    setScrollToIndex,
    handleNameChange
  };
}; 