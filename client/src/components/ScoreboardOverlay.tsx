import React from 'react';
import { Player, MatchConfig } from '../types/scoreboard';
import { formatGameScore } from '../utils/scoreHandlers';

interface ScoreboardOverlayProps {
  player1: Player;
  player2: Player;
  matchConfig: MatchConfig;
}

/**
 * A simplified scoreboard overlay for rendering onto exported videos
 */
const ScoreboardOverlay: React.FC<ScoreboardOverlayProps> = ({ player1, player2, matchConfig }) => {
  return (
    <div className="absolute bottom-5 left-5 bg-black bg-opacity-75 text-white p-2 rounded shadow-lg">
      <table className="table-auto text-sm">
        <tbody>
          <tr>
            <td className="pr-3 py-1 font-medium">
              {player1.name || 'Player 1'} {player1.isServing && '•'}
            </td>
            
            {matchConfig.type === 'match' && (
              <>
                {player1.completedSets.map((setData, index) => (
                  <td key={index} className="px-2 py-1 text-center">
                    <span className={setData.wonSet ? 'font-bold' : ''}>
                      {setData.score}
                      {setData.tiebreakScore !== undefined && (
                        <sup className="text-xs ml-0.5">{setData.tiebreakScore}</sup>
                      )}
                    </span>
                  </td>
                ))}
                <td className="px-2 py-1 text-center">
                  {player1.currentSet}
                </td>
                <td className="px-2 py-1 text-center">
                  {matchConfig.inTiebreak 
                    ? player1.currentGame
                    : formatGameScore(player1.currentGame, player2.currentGame)
                  }
                </td>
              </>
            )}
            
            {matchConfig.type === 'tiebreak' && (
              <td className="px-2 py-1 text-center">
                {player1.currentGame}
              </td>
            )}
          </tr>
          
          <tr>
            <td className="pr-3 py-1 font-medium">
              {player2.name || 'Player 2'} {player2.isServing && '•'}
            </td>
            
            {matchConfig.type === 'match' && (
              <>
                {player2.completedSets.map((setData, index) => (
                  <td key={index} className="px-2 py-1 text-center">
                    <span className={setData.wonSet ? 'font-bold' : ''}>
                      {setData.score}
                      {setData.tiebreakScore !== undefined && (
                        <sup className="text-xs ml-0.5">{setData.tiebreakScore}</sup>
                      )}
                    </span>
                  </td>
                ))}
                <td className="px-2 py-1 text-center">
                  {player2.currentSet}
                </td>
                <td className="px-2 py-1 text-center">
                  {matchConfig.inTiebreak 
                    ? player2.currentGame
                    : formatGameScore(player2.currentGame, player1.currentGame)
                  }
                </td>
              </>
            )}
            
            {matchConfig.type === 'tiebreak' && (
              <td className="px-2 py-1 text-center">
                {player2.currentGame}
              </td>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ScoreboardOverlay; 