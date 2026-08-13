import { createCanvas } from '@napi-rs/canvas';
import { formatCurrentGame, type MatchConfig, type ScoreState } from '@gamesetai/scoring';

const WIDTH = 360;
const HEIGHT = 88;

export async function renderScoreboardPng(
  state: ScoreState,
  config: MatchConfig,
  names: { player1: string; player2: string }
): Promise<Buffer> {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const game = formatCurrentGame(state, config);

  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
  roundRect(ctx, 0, 0, WIDTH, HEIGHT, 8);
  ctx.fill();

  const rows: Array<{
    name: string;
    serving: boolean;
    sets: Array<{ score: number; tiebreakScore?: number; won: boolean }>;
    currentSet: number;
    game: string;
  }> = [
    {
      name: names.player1 || 'Player 1',
      serving: state.player1.isServing,
      sets: state.player1.completedSets.map((set) => ({
        score: set.score,
        tiebreakScore: set.tiebreakScore,
        won: set.wonSet,
      })),
      currentSet: state.player1.currentSet,
      game: game.player1,
    },
    {
      name: names.player2 || 'Player 2',
      serving: state.player2.isServing,
      sets: state.player2.completedSets.map((set) => ({
        score: set.score,
        tiebreakScore: set.tiebreakScore,
        won: set.wonSet,
      })),
      currentSet: state.player2.currentSet,
      game: game.player2,
    },
  ];

  const showCurrentSet = config.type === 'match';
  const nameX = 16;
  const colStart = 168;
  const colW = 28;

  rows.forEach((row, index) => {
    const y = 32 + index * 36;
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(truncate(row.name, 16), nameX, y);

    if (row.serving) {
      ctx.beginPath();
      ctx.fillStyle = '#34d399';
      ctx.arc(nameX + ctx.measureText(truncate(row.name, 16)).width + 10, y - 5, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = 'center';
    if (showCurrentSet) {
      row.sets.forEach((set, setIndex) => {
        const x = colStart + setIndex * colW;
        ctx.fillStyle = set.won ? '#ffffff' : '#d1d5db';
        ctx.font = set.won ? '700 16px sans-serif' : '500 16px sans-serif';
        ctx.fillText(String(set.score), x, y);
        if (set.tiebreakScore !== undefined) {
          ctx.font = '500 10px sans-serif';
          ctx.fillText(String(set.tiebreakScore), x + 10, y - 10);
        }
      });
      const x = colStart + row.sets.length * colW;
      ctx.fillStyle = '#ffffff';
      ctx.font = '500 16px sans-serif';
      ctx.fillText(String(row.currentSet), x, y);
      ctx.fillText(row.game, x + colW + 8, y);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 18px sans-serif';
      ctx.fillText(row.game, colStart, y);
    }
  });

  return canvas.toBuffer('image/png');
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function roundRect(
  ctx: { beginPath(): void; moveTo(x: number, y: number): void; arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void; closePath(): void },
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
