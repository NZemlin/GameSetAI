import { describe, expect, it } from 'vitest';
import { formatCurrentGame, formatGameScore, initialScore, replay } from '../src/index';
import type { MatchConfig, PlayerId, Point } from '../src/index';

function point(winner: PlayerId, index = 0): Point {
  return {
    startTime: index,
    endTime: index + 1,
    winner,
    source: 'manual',
    confirmed: true,
  };
}

function points(winners: PlayerId[]): Point[] {
  return winners.map((winner, index) => point(winner, index));
}

const match = (overrides: Partial<MatchConfig> = {}): MatchConfig => ({
  type: 'match',
  tiebreakPoints: 7,
  noAd: false,
  firstServer: 1,
  ...overrides,
});

describe('formatGameScore', () => {
  it('maps 0/15/30/40/Ad', () => {
    expect(formatGameScore(0, 0)).toBe('0');
    expect(formatGameScore(1, 0)).toBe('15');
    expect(formatGameScore(2, 0)).toBe('30');
    expect(formatGameScore(3, 0)).toBe('40');
    expect(formatGameScore(4, 3)).toBe('Ad');
  });

  it('hides the trailing player when opponent has Ad', () => {
    expect(formatGameScore(3, 4)).toBe('');
  });
});

describe('initialScore', () => {
  it('gives serve to firstServer', () => {
    const state = initialScore(match({ firstServer: 2 }));
    expect(state.player1.isServing).toBe(false);
    expect(state.player2.isServing).toBe(true);
    expect(state.inTiebreak).toBe(false);
  });

  it('starts a tiebreak-only match in tiebreak', () => {
    const state = initialScore(match({ type: 'tiebreak' }));
    expect(state.inTiebreak).toBe(true);
  });
});

describe('regular game scoring', () => {
  it('awards 15-0 then 30-0', () => {
    const { score } = replay(match(), points([1, 1]));
    expect(formatCurrentGame(score, match())).toEqual({ player1: '30', player2: '0' });
  });

  it('wins a game from 40-0', () => {
    const { score } = replay(match(), points([1, 1, 1, 1]));
    expect(score.player1.currentSet).toBe(1);
    expect(score.player1.currentGame).toBe(0);
    expect(score.player2.currentGame).toBe(0);
    expect(score.player1.isServing).toBe(false);
    expect(score.player2.isServing).toBe(true);
  });

  it('goes to deuce then Ad then back to deuce then game', () => {
    // 40-0, 40-15, 40-30, deuce, P1 Ad, deuce, P2 Ad, P2 game
    const { score, points: scored } = replay(
      match(),
      points([1, 1, 1, 2, 2, 2, 1, 2, 2, 2])
    );
    const deuce = scored[5];
    expect(deuce.scoreState.player1.currentGame).toBe(3);
    expect(deuce.scoreState.player2.currentGame).toBe(3);

    const ad = scored[6];
    expect(formatCurrentGame(ad.scoreState, match())).toEqual({ player1: 'Ad', player2: '' });

    const back = scored[7];
    expect(back.scoreState.player1.currentGame).toBe(3);
    expect(back.scoreState.player2.currentGame).toBe(3);

    expect(score.player2.currentSet).toBe(1);
    expect(score.player1.currentGame).toBe(0);
  });

  it('no-ad: next point after deuce wins the game', () => {
    const config = match({ noAd: true });
    const { score } = replay(config, points([1, 1, 1, 2, 2, 2, 2]));
    expect(score.player2.currentSet).toBe(1);
    expect(score.player1.currentGame).toBe(0);
    expect(score.player2.currentGame).toBe(0);
  });
});

describe('sets', () => {
  function winGame(winner: PlayerId): PlayerId[] {
    return [winner, winner, winner, winner];
  }

  function winGames(winner: PlayerId, count: number): PlayerId[] {
    return Array.from({ length: count }, () => winGame(winner)).flat();
  }

  it('wins a set 6-0', () => {
    const { score } = replay(match(), points(winGames(1, 6)));
    expect(score.player1.completedSets).toEqual([{ score: 6, wonSet: true }]);
    expect(score.player2.completedSets).toEqual([{ score: 0, wonSet: false }]);
    expect(score.player1.currentSet).toBe(0);
    expect(score.player2.currentSet).toBe(0);
  });

  it('does not award the set at 6-5', () => {
    const winners = [...winGames(1, 5), ...winGames(2, 5), ...winGame(1)];
    const { score } = replay(match(), points(winners));
    expect(score.player1.currentSet).toBe(6);
    expect(score.player2.currentSet).toBe(5);
    expect(score.player1.completedSets).toHaveLength(0);
  });

  it('wins 7-5 without a tiebreak', () => {
    const winners = [...winGames(1, 5), ...winGames(2, 5), ...winGame(1), ...winGame(1)];
    const { score } = replay(match(), points(winners));
    expect(score.player1.completedSets[0]).toMatchObject({ score: 7, wonSet: true });
    expect(score.player2.completedSets[0]).toMatchObject({ score: 5, wonSet: false });
    expect(score.inTiebreak).toBe(false);
  });

  it('starts a tiebreak at 6-6', () => {
    const winners = [...winGames(1, 5), ...winGames(2, 5), ...winGame(1), ...winGame(2)];
    const { score } = replay(match(), points(winners));
    expect(score.player1.currentSet).toBe(6);
    expect(score.player2.currentSet).toBe(6);
    expect(score.inTiebreak).toBe(true);
    expect(score.player1.currentGame).toBe(0);
  });
});

describe('set tiebreak', () => {
  function winGame(winner: PlayerId): PlayerId[] {
    return [winner, winner, winner, winner];
  }

  function toSixAll(): PlayerId[] {
    return [
      ...Array.from({ length: 5 }, () => winGame(1)).flat(),
      ...Array.from({ length: 5 }, () => winGame(2)).flat(),
      ...winGame(1),
      ...winGame(2),
    ];
  }

  it('is won 7-5 and records 7-6 with TB scores', () => {
    const winners = [...toSixAll(), 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 1, 1];
    const { score } = replay(match(), points(winners));
    expect(score.inTiebreak).toBe(false);
    expect(score.player1.completedSets[0]).toEqual({
      score: 7,
      tiebreakScore: 7,
      wonSet: true,
    });
    expect(score.player2.completedSets[0]).toEqual({
      score: 6,
      tiebreakScore: 5,
      wonSet: false,
    });
  });

  it('must win by two (8-6)', () => {
    const winners = [...toSixAll(), ...Array(6).fill(1), ...Array(6).fill(2), 1, 1] as PlayerId[];
    const { score } = replay(match(), points(winners));
    expect(score.player1.completedSets[0].tiebreakScore).toBe(8);
    expect(score.player2.completedSets[0].tiebreakScore).toBe(6);
  });

  it('rotates serve after the first point then every two', () => {
    const { points: scored } = replay(match(), points([...toSixAll(), 1, 1]));
    const firstTb = scored[scored.length - 2];
    const secondTb = scored[scored.length - 1];
    expect(firstTb.scoreState.player1.isServing).toBe(false);
    expect(firstTb.scoreState.player2.isServing).toBe(true);
    expect(secondTb.scoreState.player1.isServing).toBe(false);
    expect(secondTb.scoreState.player2.isServing).toBe(true);
  });

  it('gives the next set to the player who received first in the TB', () => {
    // 12 games from P1 serving first → P1 serves the TB. Receiver (P2) starts next set.
    const winners = [...toSixAll(), 1, 1, 1, 1, 1, 1, 1];
    const { score } = replay(match(), points(winners));
    expect(score.player1.isServing).toBe(false);
    expect(score.player2.isServing).toBe(true);
  });

  it('uses the actual TB first server after an odd-length previous set', () => {
    // Set 1: 6-3 P1 (9 games, odd) → P2 serves set 2 and therefore the 6-6 TB.
    const setOne = [
      ...Array.from({ length: 6 }, () => winGame(1)).flat(),
      ...Array.from({ length: 3 }, () => winGame(2)).flat(),
    ];
    const setTwoToTb = toSixAll();
    const tb = [2, 2, 2, 2, 2, 2, 2] as PlayerId[];
    const { score } = replay(match(), points([...setOne, ...setTwoToTb, ...tb]));
    expect(score.player1.completedSets).toHaveLength(2);
    // P2 served first in the TB, so P1 received first and serves the next set.
    expect(score.player1.isServing).toBe(true);
    expect(score.player2.isServing).toBe(false);
  });
});

describe('tiebreak-only match', () => {
  const tb = match({ type: 'tiebreak', tiebreakPoints: 7 });

  it('records the TB score and stops serving', () => {
    const { score } = replay(tb, points([1, 1, 1, 1, 1, 2, 1, 1]));
    expect(score.player1.completedSets[0]).toEqual({ score: 7, wonSet: true });
    expect(score.player2.completedSets[0]).toEqual({ score: 1, wonSet: false });
    expect(score.player1.isServing).toBe(false);
    expect(score.player2.isServing).toBe(false);
  });

  it('supports first-to-10', () => {
    const config = match({ type: 'tiebreak', tiebreakPoints: 10 });
    const { score } = replay(config, points(Array(10).fill(1) as PlayerId[]));
    expect(score.player1.completedSets[0].score).toBe(10);
  });

  it('keeps the final TB score on the board and does not insert a divider', () => {
    const config = match({ type: 'tiebreak', tiebreakPoints: 10 });
    const winners = [...Array(9).fill(1), ...Array(5).fill(2), 1] as PlayerId[];
    const { score, points: scored } = replay(config, points(winners));
    expect(formatCurrentGame(score, config)).toEqual({ player1: '10', player2: '5' });
    expect(scored[scored.length - 1].divider).toBeUndefined();
    expect(scored.every((point) => point.divider === undefined)).toBe(true);
  });
});

describe('replay extras', () => {
  it('skips points with no winner', () => {
    const mixed: Point[] = [
      point(1, 0),
      { startTime: 1, endTime: 2, winner: null, source: 'auto', confirmed: false },
      point(1, 2),
    ];
    const { points: scored, score } = replay(match(), mixed);
    expect(scored).toHaveLength(2);
    expect(score.player1.currentGame).toBe(2);
  });

  it('marks a game divider after a game win', () => {
    const { points: scored } = replay(match(), points([1, 1, 1, 1]));
    expect(scored[3].divider).toBe('game');
  });

  it('marks a set divider after a set win', () => {
    const winners = Array.from({ length: 6 }, () => [1, 1, 1, 1] as PlayerId[]).flat();
    const { points: scored } = replay(match(), points(winners));
    expect(scored[scored.length - 1].divider).toBe('set');
  });

  it('is deterministic when replayed twice', () => {
    const input = points([1, 2, 1, 2, 1, 1]);
    expect(replay(match(), input)).toEqual(replay(match(), input));
  });
});
