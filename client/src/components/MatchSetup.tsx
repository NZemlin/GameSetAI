import { useState } from 'react';
import type { MatchConfig, PlayerId } from '@gamesetai/scoring';

interface Props {
  names: { player1: string; player2: string };
  onNames: (names: { player1: string; player2: string }) => void;
  onStart: (config: MatchConfig) => void;
}

export default function MatchSetup({ names, onNames, onStart }: Props) {
  const [type, setType] = useState<MatchConfig['type']>('match');
  const [tiebreakPoints, setTiebreakPoints] = useState<7 | 10>(7);
  const [noAd, setNoAd] = useState(false);
  const [firstServer, setFirstServer] = useState<PlayerId | null>(null);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">Match setup</h2>
      <div>
        <p className="text-xs font-medium text-gray-500">Players</p>
        <input
          value={names.player1}
          onChange={(e) => onNames({ ...names, player1: e.target.value })}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          placeholder="Player 1"
        />
        <input
          value={names.player2}
          onChange={(e) => onNames({ ...names, player2: e.target.value })}
          className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          placeholder="Player 2"
        />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">Type</p>
        <div className="mt-1 flex gap-2">
          <Choice active={type === 'match'} onClick={() => setType('match')}>
            Full match
          </Choice>
          <Choice active={type === 'tiebreak'} onClick={() => setType('tiebreak')}>
            Tiebreak only
          </Choice>
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">Tiebreak</p>
        <div className="mt-1 flex gap-2">
          <Choice active={tiebreakPoints === 7} onClick={() => setTiebreakPoints(7)}>
            First to 7
          </Choice>
          <Choice active={tiebreakPoints === 10} onClick={() => setTiebreakPoints(10)}>
            First to 10
          </Choice>
        </div>
      </div>
      {type === 'match' && (
        <div>
          <p className="text-xs font-medium text-gray-500">Scoring</p>
          <div className="mt-1 flex gap-2">
            <Choice active={!noAd} onClick={() => setNoAd(false)}>
              Ad
            </Choice>
            <Choice active={noAd} onClick={() => setNoAd(true)}>
              No-ad
            </Choice>
          </div>
        </div>
      )}
      <div>
        <p className="text-xs font-medium text-gray-500">First server</p>
        <div className="mt-1 flex gap-2">
          <Choice active={firstServer === 1} onClick={() => setFirstServer(1)}>
            {names.player1 || 'Player 1'}
          </Choice>
          <Choice active={firstServer === 2} onClick={() => setFirstServer(2)}>
            {names.player2 || 'Player 2'}
          </Choice>
        </div>
      </div>
      <button
        type="button"
        disabled={firstServer === null}
        onClick={() =>
          firstServer &&
          onStart({ type, tiebreakPoints, noAd: type === 'tiebreak' ? false : noAd, firstServer })
        }
        className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300"
      >
        Start scoring
      </button>
    </div>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm ${
        active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}
