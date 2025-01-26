export interface Player {
  name: string;
  completedSets: Array<{
    score: number;
    tiebreakScore?: number;
    wonSet: boolean;
  }>;
  currentSet: number;
  currentGame: number;
  isServing: boolean;
}

export interface MatchConfig {
  type: 'match' | 'tiebreak' | null;
  tiebreakPoints: 7 | 10;
  noAd: boolean;
  inTiebreak: boolean;
  firstServer: 1 | 2 | null;
}

export interface Point {
  startTime: number | null;
  endTime: number | null;
  winner: 1 | 2 | null;
  scoreState?: {
    player1: Player;
    player2: Player;
    inTiebreak: boolean;
  };
  divider?: 'set' | 'game' | 'tiebreak' | 'tiebreak-start';
}

export interface ChronologicalPoints {
  points: Point[];
  currentIndex: number;
}

export interface ScoreboardProps {
  onPlayerNamesChange?: (player1: string, player2: string) => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
} 