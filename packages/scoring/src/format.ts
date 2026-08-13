import type { MatchConfig, ScoreState } from './types';

/** Convert a regular-game point count to tennis notation. */
export function formatGameScore(score: number, otherScore: number): string {
  if (otherScore === 4) return '';
  switch (score) {
    case 0:
      return '0';
    case 1:
      return '15';
    case 2:
      return '30';
    case 3:
      return '40';
    case 4:
      return 'Ad';
    default:
      return '';
  }
}

function completedStandaloneTiebreak(state: ScoreState, config: MatchConfig): boolean {
  return (
    config.type === 'tiebreak' &&
    state.player1.completedSets.length > 0 &&
    state.player1.currentGame === 0 &&
    state.player2.currentGame === 0
  );
}

export function formatCurrentGame(
  state: ScoreState,
  config: MatchConfig
): { player1: string; player2: string } {
  if (completedStandaloneTiebreak(state, config)) {
    const last = state.player1.completedSets.length - 1;
    return {
      player1: String(state.player1.completedSets[last].score),
      player2: String(state.player2.completedSets[last].score),
    };
  }
  if (config.type === 'tiebreak' || state.inTiebreak) {
    return {
      player1: String(state.player1.currentGame),
      player2: String(state.player2.currentGame),
    };
  }
  return {
    player1: formatGameScore(state.player1.currentGame, state.player2.currentGame),
    player2: formatGameScore(state.player2.currentGame, state.player1.currentGame),
  };
}
