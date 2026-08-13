export type PlayerId = 1 | 2;

export type MatchType = 'match' | 'tiebreak';

export type PointSource = 'manual' | 'auto';

export type Divider = 'set' | 'game' | 'tiebreak' | 'tiebreak-start';

export interface MatchConfig {
  type: MatchType;
  tiebreakPoints: 7 | 10;
  noAd: boolean;
  firstServer: PlayerId;
}

export interface SetScore {
  score: number;
  tiebreakScore?: number;
  wonSet: boolean;
}

export interface PlayerState {
  completedSets: SetScore[];
  currentSet: number;
  currentGame: number;
  isServing: boolean;
}

export interface ScoreState {
  player1: PlayerState;
  player2: PlayerState;
  inTiebreak: boolean;
}

export interface Point {
  startTime: number;
  endTime: number;
  winner: PlayerId | null;
  source: PointSource;
  confirmed: boolean;
}

export interface PointWithState extends Point {
  scoreState: ScoreState;
  divider?: Divider;
}

export interface ReplayResult {
  score: ScoreState;
  points: PointWithState[];
}
