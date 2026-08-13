import { useState } from 'react';
import { formatCurrentGame, type MatchConfig, type PlayerId, type Point, type ScoreState } from '@gamesetai/scoring';
import PointEditTimeline from './PointEditTimeline';

interface Props {
  config: MatchConfig;
  names: { player1: string; player2: string };
  score: ScoreState;
  currentStart: number | null;
  currentTime: number;
  inExistingPoint: boolean;
  activePointIndex: number | null;
  points: Point[];
  videoDuration: number;
  onStart: () => void;
  onWinner: (winner: PlayerId) => void;
  onNames: (names: { player1: string; player2: string }) => void;
  onSaveEdit: (index: number, point: Point) => void;
  onSeek: (time: number) => void;
}

export default function ScorePanel({
  config,
  names,
  score,
  currentStart,
  currentTime,
  inExistingPoint,
  activePointIndex,
  points,
  videoDuration,
  onStart,
  onWinner,
  onNames,
  onSaveEdit,
  onSeek,
}: Props) {
  const game = formatCurrentGame(score, config);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editStart, setEditStart] = useState(0);
  const [editEnd, setEditEnd] = useState(0);
  const [editWinner, setEditWinner] = useState<PlayerId>(1);
  const [editError, setEditError] = useState('');
  const editing = editIndex !== null && points[editIndex] !== undefined;

  const beginEdit = () => {
    if (activePointIndex === null) return;
    const point = points[activePointIndex];
    setEditIndex(activePointIndex);
    setEditStart(point.startTime);
    setEditEnd(point.endTime);
    setEditWinner(point.winner ?? 1);
    setEditError('');
  };

  const saveEdit = () => {
    if (editIndex === null || !points[editIndex]) return;
    if (editEnd <= editStart) {
      setEditError('End time must be after start time.');
      return;
    }
    onSaveEdit(editIndex, {
      ...points[editIndex],
      startTime: editStart,
      endTime: editEnd,
      winner: editWinner,
      confirmed: true,
    });
    setEditIndex(null);
  };

  const neighbors = () => {
    if (editIndex === null) return { previousEnd: null as number | null, nextStart: null as number | null };
    const others = points.filter((_, index) => index !== editIndex);
    let previousEnd: number | null = null;
    let nextStart: number | null = null;
    others.forEach((point) => {
      if (point.endTime <= editStart && (previousEnd === null || point.endTime > previousEnd)) {
        previousEnd = point.endTime;
      }
      if (point.startTime >= editEnd && (nextStart === null || point.startTime < nextStart)) {
        nextStart = point.startTime;
      }
    });
    return { previousEnd, nextStart };
  };

  const row = (id: PlayerId) => {
    const player = id === 1 ? score.player1 : score.player2;
    const name = id === 1 ? names.player1 : names.player2;
    return (
      <tr>
        <td className="py-1 pr-3">
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) =>
                onNames(id === 1 ? { ...names, player1: e.target.value } : { ...names, player2: e.target.value })
              }
              className="w-full bg-transparent text-sm font-medium text-gray-900 outline-none"
            />
            {player.isServing && <span className="h-2 w-2 rounded-full bg-emerald-500" title="Serving" />}
          </div>
        </td>
        {config.type === 'match' &&
          player.completedSets.map((set, index) => (
            <td
              key={index}
              className={`px-1 text-center text-sm ${set.wonSet ? 'font-bold text-gray-900' : 'text-gray-500'}`}
            >
              {set.score}
              {set.tiebreakScore !== undefined && <sup className="ml-0.5 text-[10px]">{set.tiebreakScore}</sup>}
            </td>
          ))}
        {config.type === 'match' && (
          <td className="px-1 text-center text-sm font-medium">{player.currentSet}</td>
        )}
        <td className="px-1 text-center text-sm font-semibold">{id === 1 ? game.player1 : game.player2}</td>
      </tr>
    );
  };

  if (editing && editIndex !== null) {
    const { previousEnd, nextStart } = neighbors();
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Edit point {editIndex + 1}</h3>
        {editError && <p className="mt-2 text-sm text-red-600">{editError}</p>}
        <PointEditTimeline
          startTime={editStart}
          endTime={editEnd}
          videoDuration={videoDuration}
          previousEnd={previousEnd}
          nextStart={nextStart}
          onStartChange={setEditStart}
          onEndChange={setEditEnd}
          onSeek={onSeek}
        />
        <label className="mt-6 block text-xs font-medium text-gray-500">Winner</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setEditWinner(1)}
            className={`rounded-md px-3 py-2 text-sm ${
              editWinner === 1 ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {names.player1}
          </button>
          <button
            type="button"
            onClick={() => setEditWinner(2)}
            className={`rounded-md px-3 py-2 text-sm ${
              editWinner === 2 ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {names.player2}
          </button>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setEditIndex(null)} className="text-sm text-gray-500">
            Cancel
          </button>
          <button
            type="button"
            onClick={saveEdit}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  const invalidEnd = currentStart !== null && currentTime <= currentStart;
  const canAward = currentStart !== null && !invalidEnd && !inExistingPoint;

  return (
    <div>
      <table className="w-full">
        <tbody>
          {row(1)}
          {row(2)}
        </tbody>
      </table>

      <div className="mt-4 space-y-2">
        {inExistingPoint ? (
          <button
            type="button"
            onClick={beginEdit}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-gray-50"
          >
            Edit point
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onStart}
              className="w-full rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
            >
              Start point
            </button>
            {currentStart !== null && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onWinner(1)}
                  disabled={!canAward}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300"
                >
                  {names.player1 || 'Player 1'}
                </button>
                <button
                  type="button"
                  onClick={() => onWinner(2)}
                  disabled={!canAward}
                  className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:bg-slate-400"
                >
                  {names.player2 || 'Player 2'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
