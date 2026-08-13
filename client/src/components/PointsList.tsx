import type { MatchConfig, PointWithState } from '@gamesetai/scoring';
import { formatClock } from '../lib/time';

interface Props {
  points: PointWithState[];
  names: { player1: string; player2: string };
  config: MatchConfig;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
}

function ordinal(index: number): string {
  return ['first', 'second', 'third', 'fourth', 'fifth'][index] ?? `${index + 1}th`;
}

export default function PointsList({
  points,
  names,
  config,
  selectedIndex,
  onSelect,
  onDelete,
}: Props) {
  if (points.length === 0) {
    return <p className="text-sm text-gray-500">No points yet. Start a point on the video.</p>;
  }

  const firstServer = config.firstServer === 1 ? names.player1 : names.player2;

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-gray-500">{points.length} points</p>
      <ul className="max-h-80 space-y-1 overflow-y-auto pr-1">
        <li className="rounded bg-indigo-50 px-2 py-2 text-center text-xs font-medium text-gray-800">
          {firstServer} starts the match
        </li>
        {points.map((point, index) => (
          <li key={`${point.startTime}-${index}`} data-point={index}>
            <button
              type="button"
              onClick={() => onSelect(index)}
              className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm ${
                selectedIndex === index
                  ? 'bg-indigo-600 text-white'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span>
                {index + 1}. Point to {point.winner === 1 ? names.player1 : names.player2}
                {point.source === 'auto' && !point.confirmed && (
                  <span className="ml-2 text-[10px] uppercase text-amber-600">auto</span>
                )}
              </span>
              <span className={`flex items-center gap-2 text-xs ${selectedIndex === index ? 'text-indigo-100' : 'text-gray-500'}`}>
                {formatClock(point.startTime)}–{formatClock(point.endTime)}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(index);
                  }}
                  className={selectedIndex === index ? 'text-white/80 hover:text-white' : 'text-red-400 hover:text-red-600'}
                >
                  ×
                </span>
              </span>
            </button>
            {point.divider && (
              <Divider point={point} names={names} config={config} priorPoints={points.slice(0, index)} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Divider({
  point,
  names,
  config,
  priorPoints,
}: {
  point: PointWithState;
  names: { player1: string; player2: string };
  config: MatchConfig;
  priorPoints: PointWithState[];
}) {
  const state = point.scoreState;
  const winnerName = point.winner === 1 ? names.player1 : names.player2;
  const winner = point.winner === 1 ? state.player1 : state.player2;
  const loser = point.winner === 1 ? state.player2 : state.player1;

  if (point.divider === 'set') {
    const setIndex = state.player1.completedSets.length - 1;
    const last = winner.completedSets[setIndex];
    const other = loser.completedSets[setIndex];
    return (
      <div className="my-2 rounded bg-indigo-50 px-2 py-2 text-center">
        <div className="text-xs font-medium text-gray-900">
          {winnerName} takes the {ordinal(setIndex)} {config.type === 'match' ? 'set' : 'tiebreak'}
        </div>
        {last && other && (
          <div className="text-xs font-semibold text-gray-800">
            {last.score}–{other.score}
            {last.tiebreakScore !== undefined && other.tiebreakScore !== undefined
              ? ` (${last.tiebreakScore}–${other.tiebreakScore})`
              : ''}
          </div>
        )}
      </div>
    );
  }

  if (point.divider === 'tiebreak') {
    const tbIndex = priorPoints.filter((item) => item.divider === 'tiebreak').length;
    const setIndex = state.player1.completedSets.length - 1;
    const last = winner.completedSets[setIndex];
    const other = loser.completedSets[setIndex];
    return (
      <div className="my-2 rounded bg-indigo-50 px-2 py-2 text-center">
        <div className="text-xs font-medium text-gray-900">
          {winnerName} wins the {ordinal(tbIndex)} tiebreak
        </div>
        {last && other && (
          <div className="text-xs font-semibold text-gray-800">
            {last.score}–{other.score}
          </div>
        )}
      </div>
    );
  }

  if (point.divider === 'tiebreak-start') {
    const server = state.player1.isServing ? names.player1 : names.player2;
    const setIndex = state.player1.completedSets.length;
    return (
      <div className="my-2 rounded bg-indigo-50/80 px-2 py-2 text-center text-xs font-medium text-gray-900">
        {server} starts the {ordinal(setIndex)} set tiebreak
      </div>
    );
  }

  const nextServer = state.player1.isServing ? names.player1 : names.player2;
  const serverGames = state.player1.isServing ? state.player1.currentSet : state.player2.currentSet;
  const receiverGames = state.player1.isServing ? state.player2.currentSet : state.player1.currentSet;
  return (
    <div className="my-2 rounded bg-indigo-50/60 px-2 py-1.5 text-center">
      <div className="text-xs text-gray-700">{nextServer} to serve</div>
      <div className="text-xs font-medium text-gray-900">
        {serverGames}–{receiverGames}
      </div>
    </div>
  );
}
