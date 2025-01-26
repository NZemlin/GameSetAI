import { Player, MatchConfig } from '../types/scoreboard';

export const usePointHandling = (
  setPlayer1: React.Dispatch<React.SetStateAction<Player>>,
  setPlayer2: React.Dispatch<React.SetStateAction<Player>>,
  setMatchConfig: React.Dispatch<React.SetStateAction<MatchConfig>>,
  updateServerAfterTiebreak: (matchConfig: MatchConfig, player1: Player, player2: Player, tiebreakWon: boolean) => void
) => {
  const startTiebreak = () => {
    // Keep the current set scores (6-6) but reset game scores
    setPlayer1(prev => ({ ...prev, currentGame: 0 }));
    setPlayer2(prev => ({ ...prev, currentGame: 0 }));
    
    // Switch to tiebreak scoring mode
    setMatchConfig(prev => ({
      ...prev,
      inTiebreak: true,
    }));
  };

  const handleSetWin = (winner: 1 | 2) => {
    // Add completed set to completedSets array
    setPlayer1(prev => ({
      ...prev,
      completedSets: [...prev.completedSets, {
        score: prev.currentSet,
        wonSet: winner === 1
      }],
      currentSet: 0,
      currentGame: 0
    }));
    setPlayer2(prev => ({
      ...prev,
      completedSets: [...prev.completedSets, {
        score: prev.currentSet,
        wonSet: winner === 2
      }],
      currentSet: 0,
      currentGame: 0
    }));
  };

  const handleTiebreakWin = (winner: 1 | 2, matchConfig: MatchConfig, player1: Player, player2: Player) => {
    if (matchConfig.type === 'match') {
      // For full match mode, record the set as 7-6 with tiebreak score
      setPlayer1(prev => ({
        ...prev,
        completedSets: [...prev.completedSets, {
          score: winner === 1 ? 7 : 6,
          tiebreakScore: prev.currentGame,
          wonSet: winner === 1
        }],
        currentSet: 0,
        currentGame: 0,
      }));
      setPlayer2(prev => ({
        ...prev,
        completedSets: [...prev.completedSets, {
          score: winner === 2 ? 7 : 6,
          tiebreakScore: prev.currentGame,
          wonSet: winner === 2
        }],
        currentSet: 0,
        currentGame: 0,
      }));
      // Switch back to regular game mode and scoring
      setMatchConfig(prev => ({
        ...prev,
        inTiebreak: false,
      }));
      updateServerAfterTiebreak(matchConfig, player1, player2, true);
    } else {
      // For tiebreak-only mode, record just the tiebreak score
      setPlayer1(prev => ({
        ...prev,
        completedSets: [...prev.completedSets, {
          score: prev.currentGame,
          wonSet: winner === 1
        }],
        currentSet: 0,
        currentGame: 0,
        isServing: false
      }));
      setPlayer2(prev => ({
        ...prev,
        completedSets: [...prev.completedSets, {
          score: prev.currentGame,
          wonSet: winner === 2
        }],
        currentSet: 0,
        currentGame: 0,
        isServing: false
      }));
    }
  };

  return {
    startTiebreak,
    handleSetWin,
    handleTiebreakWin
  };
}; 