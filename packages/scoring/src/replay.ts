import { clone } from './clone';
import type {
  Divider,
  MatchConfig,
  PlayerId,
  PlayerState,
  Point,
  PointWithState,
  ReplayResult,
  ScoreState,
} from './types';

function emptyPlayer(isServing: boolean): PlayerState {
  return {
    completedSets: [],
    currentSet: 0,
    currentGame: 0,
    isServing,
  };
}

export function initialScore(config: MatchConfig): ScoreState {
  return {
    player1: emptyPlayer(config.firstServer === 1),
    player2: emptyPlayer(config.firstServer === 2),
    inTiebreak: config.type === 'tiebreak',
  };
}

function other(player: PlayerId): PlayerId {
  return player === 1 ? 2 : 1;
}

function playerOf(state: ScoreState, id: PlayerId): PlayerState {
  return id === 1 ? state.player1 : state.player2;
}

function isTiebreakWon(winning: number, losing: number, target: number): boolean {
  return winning >= target && winning - losing >= 2;
}

function shouldChangeTiebreakServer(totalPoints: number): boolean {
  if (totalPoints === 1) return true;
  return totalPoints > 1 && totalPoints % 2 === 1;
}

function toggleServer(state: ScoreState): void {
  state.player1.isServing = !state.player1.isServing;
  state.player2.isServing = !state.player2.isServing;
}

function completeSet(state: ScoreState, winner: PlayerId, tiebreakScore?: { p1: number; p2: number }): void {
  state.player1.completedSets.push({
    score: state.player1.currentSet,
    ...(tiebreakScore ? { tiebreakScore: tiebreakScore.p1 } : {}),
    wonSet: winner === 1,
  });
  state.player2.completedSets.push({
    score: state.player2.currentSet,
    ...(tiebreakScore ? { tiebreakScore: tiebreakScore.p2 } : {}),
    wonSet: winner === 2,
  });
  state.player1.currentSet = 0;
  state.player2.currentSet = 0;
  state.player1.currentGame = 0;
  state.player2.currentGame = 0;
}

function applyGameWin(state: ScoreState, winner: PlayerId): void {
  const winning = playerOf(state, winner);
  const losing = playerOf(state, other(winner));

  winning.currentSet += 1;
  state.player1.currentGame = 0;
  state.player2.currentGame = 0;
  toggleServer(state);

  if (winning.currentSet === 6 && losing.currentSet <= 4) {
    completeSet(state, winner);
    return;
  }
  if (winning.currentSet === 7 && losing.currentSet === 5) {
    completeSet(state, winner);
    return;
  }
  if (winning.currentSet === 6 && losing.currentSet === 6) {
    state.inTiebreak = true;
  }
}

function applyRegularPoint(state: ScoreState, winner: PlayerId, noAd: boolean): void {
  const winning = playerOf(state, winner);
  const losing = playerOf(state, other(winner));

  if (winning.currentGame === 3 && losing.currentGame === 3) {
    if (noAd) {
      winning.currentGame += 1;
    } else {
      winning.currentGame = 4;
      losing.currentGame = 3;
    }
  } else if (winning.currentGame === 4) {
    winning.currentGame += 1;
  } else if (losing.currentGame === 4) {
    winning.currentGame = 3;
    losing.currentGame = 3;
  } else {
    winning.currentGame += 1;
  }

  const gameWon =
    (winning.currentGame === 4 && losing.currentGame < 3) ||
    winning.currentGame === 5 ||
    (winning.currentGame === 4 && losing.currentGame === 3 && noAd);

  if (gameWon) {
    applyGameWin(state, winner);
  }
}

function applyTiebreakPoint(
  state: ScoreState,
  winner: PlayerId,
  config: MatchConfig,
  tiebreakFirstServer: PlayerId
): void {
  const winning = playerOf(state, winner);
  winning.currentGame += 1;

  const p1 = state.player1.currentGame;
  const p2 = state.player2.currentGame;
  const winningScore = winner === 1 ? p1 : p2;
  const losingScore = winner === 1 ? p2 : p1;

  if (isTiebreakWon(winningScore, losingScore, config.tiebreakPoints)) {
    if (config.type === 'match') {
      state.player1.currentSet = winner === 1 ? 7 : 6;
      state.player2.currentSet = winner === 2 ? 7 : 6;
      completeSet(state, winner, { p1, p2 });
      state.inTiebreak = false;
      const nextServer = other(tiebreakFirstServer);
      state.player1.isServing = nextServer === 1;
      state.player2.isServing = nextServer === 2;
    } else {
      state.player1.completedSets.push({
        score: p1,
        wonSet: winner === 1,
      });
      state.player2.completedSets.push({
        score: p2,
        wonSet: winner === 2,
      });
      state.player1.currentGame = 0;
      state.player2.currentGame = 0;
      state.player1.isServing = false;
      state.player2.isServing = false;
    }
    return;
  }

  const totalPoints = p1 + p2;
  if (shouldChangeTiebreakServer(totalPoints)) {
    toggleServer(state);
  }
}

function dividerFor(state: ScoreState, config: MatchConfig): Divider | undefined {
  if (state.player1.currentGame !== 0 || state.player2.currentGame !== 0) {
    return undefined;
  }
  // Standalone tiebreaks are one unit — a "tiebreak" divider on the winning
  // point looks like a new TB started. The match is already a tiebreak.
  if (config.type === 'tiebreak') return undefined;
  if (state.player1.currentSet === 0 && state.player2.currentSet === 0) return 'set';
  if (state.inTiebreak && state.player1.currentSet === 6 && state.player2.currentSet === 6) {
    return 'tiebreak-start';
  }
  return 'game';
}

/**
 * Replay a sequence of points from 0-0. Score is always derived; never stored.
 * Points with a null winner are skipped (auto-detected rallies awaiting a winner).
 */
export function replay(config: MatchConfig, points: Point[]): ReplayResult {
  const state = initialScore(config);
  const scored: PointWithState[] = [];
  let tiebreakFirstServer: PlayerId = config.firstServer;

  for (const point of points) {
    if (point.winner === null) continue;

    const enteringTiebreak = state.inTiebreak || config.type === 'tiebreak';
    if (enteringTiebreak && state.player1.currentGame === 0 && state.player2.currentGame === 0) {
      tiebreakFirstServer = state.player1.isServing ? 1 : 2;
    }

    if (config.type === 'tiebreak' || state.inTiebreak) {
      applyTiebreakPoint(state, point.winner, config, tiebreakFirstServer);
    } else {
      applyRegularPoint(state, point.winner, config.noAd);
    }

    const snapshot = clone(state);
    const divider = dividerFor(snapshot, config);
    scored.push({
      ...point,
      scoreState: snapshot,
      ...(divider ? { divider } : {}),
    });
  }

  return {
    score: clone(state),
    points: scored,
  };
}

/** Score as of a video timestamp: only points that have ended by `time`. */
export function replayUpTo(config: MatchConfig, points: Point[], time: number): ReplayResult {
  return replay(
    config,
    points.filter((point) => point.endTime <= time)
  );
}
