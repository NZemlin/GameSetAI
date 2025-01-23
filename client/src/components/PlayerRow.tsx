import { Player, MatchConfig } from '../types/scoreboard';
import { formatGameScore } from '../utils/scoreHandlers';

interface PlayerRowProps {
  player: Player;
  otherPlayer: Player;
  playerNumber: 1 | 2;
  matchConfig: MatchConfig;
  onNameChange: (playerNum: 1 | 2, name: string) => void;
  onSetFirstServer: (playerNum: 1 | 2) => void;
}

const PlayerRow = ({
  player,
  otherPlayer,
  playerNumber,
  matchConfig,
  onNameChange,
  onSetFirstServer
}: PlayerRowProps) => {
  return (
    <tr>
      <td className="px-3 py-2 whitespace-nowrap">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={player.name}
            onChange={(e) => onNameChange(playerNumber, e.target.value)}
            placeholder={`Player ${playerNumber}`}
            className="focus:outline-none bg-transparent text-gray-900 placeholder-gray-500 w-full"
          />
          {player.isServing && (
            <div className="w-2 h-2 rounded-full bg-[#10B981]" title="Currently Serving" />
          )}
          {!player.isServing && !otherPlayer.isServing && (
            <button
              onClick={() => onSetFirstServer(playerNumber)}
              className="inline-flex items-center px-2 py-1 border border-gray-300 text-sm font-medium rounded-md text-emerald-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-emerald-500 shadow-sm"
              title="Set as First Server"
            >
              Serve First
            </button>
          )}
        </div>
      </td>
      {matchConfig.type === 'match' && (
        <>
          {player.completedSets.map((setData, index) => (
            <td key={index} className="px-3 py-2 whitespace-nowrap text-center text-gray-900">
              <span className={setData.wonSet ? 'font-semibold' : ''}>
                {setData.score}
                {setData.tiebreakScore !== undefined && (
                  <sup className="text-xs ml-0.5 font-normal">{setData.tiebreakScore}</sup>
                )}
              </span>
            </td>
          ))}
          <td className="px-3 py-2 whitespace-nowrap text-center text-gray-900">
            {player.currentSet}
          </td>
          <td className="px-3 py-2 whitespace-nowrap text-center text-gray-900">
            {matchConfig.inTiebreak 
              ? player.currentGame
              : formatGameScore(player.currentGame, otherPlayer.currentGame)
            }
          </td>
        </>
      )}
      {matchConfig.type === 'tiebreak' && (
        <>
          {player.completedSets.map((setData, index) => (
            <td key={index} className="px-3 py-2 whitespace-nowrap text-center text-gray-900">
              <span className={setData.wonSet ? 'font-semibold' : ''}>
                {setData.score}
              </span>
            </td>
          ))}
          <td className="px-3 py-2 whitespace-nowrap text-center text-gray-900">
            {player.currentGame}
          </td>
        </>
      )}
    </tr>
  );
};

export default PlayerRow; 