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
  tiebreakFirstServer: 1 | 2 | null;  // Track who served first in tiebreak
}

export interface Point {
  startTime: number | null;
  endTime: number | null;
  winner: 1 | 2 | null;
}

export interface ScoreboardProps {
  onPlayerNamesChange?: (player1: string, player2: string) => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
} 