import { calculateServer } from '../utils/scoreHandlers';
import { Player, MatchConfig } from '../types/scoreboard';

export const useServerManagement = (
  setPlayer1: React.Dispatch<React.SetStateAction<Player>>,
  setPlayer2: React.Dispatch<React.SetStateAction<Player>>,
  setMatchConfig: React.Dispatch<React.SetStateAction<MatchConfig>>
): {
  switchServer: () => void;
  setFirstServer: (playerNum: 1 | 2) => void;
  updateServerAfterTiebreak: (matchConfig: MatchConfig, player1: Player, player2: Player, tiebreakWon: boolean) => void;
} => {
  const switchServer = () => {
    setPlayer1(prev => ({ ...prev, isServing: !prev.isServing }));
    setPlayer2(prev => ({ ...prev, isServing: !prev.isServing }));
  };

  const setFirstServer = (playerNum: 1 | 2) => {
    setPlayer1(prev => ({ ...prev, isServing: playerNum === 1 }));
    setPlayer2(prev => ({ ...prev, isServing: playerNum === 2 }));
    setMatchConfig(prev => ({ ...prev, firstServer: playerNum }));
  };

  const updateServerAfterTiebreak = (matchConfig: MatchConfig, player1: Player, player2: Player, tiebreakWon: boolean) => {
    const nextServer = calculateServer(matchConfig, player1, player2, tiebreakWon);
    setPlayer1(prev => ({ ...prev, isServing: nextServer === 1 }));
    setPlayer2(prev => ({ ...prev, isServing: nextServer === 2 }));
  };

  return {
    switchServer,
    setFirstServer,
    updateServerAfterTiebreak
  };
}; 