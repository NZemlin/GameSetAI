import { Player, MatchConfig } from '../types/scoreboard';

// Convert game score number to tennis scoring format
export const formatGameScore = (score: number, otherPlayerScore: number): string => {
  // If other player has Ad, return empty string
  if (otherPlayerScore === 4) return '';
  
  switch (score) {
    case 0: return '0';
    case 1: return '15';
    case 2: return '30';
    case 3: return '40';
    case 4: return 'Ad';
    default: return '';
  }
};

export const handleRegularPoint = (
  winner: 1 | 2,
  player1: Player,
  player2: Player,
  matchConfig: MatchConfig,
  setPlayer1: (value: React.SetStateAction<Player>) => void,
  setPlayer2: (value: React.SetStateAction<Player>) => void,
  handleGameWin: (winner: 1 | 2) => void
) => {
  const winningPlayer = winner === 1 ? player1 : player2;
  const losingPlayer = winner === 1 ? player2 : player1;
  
  // Handle deuce scoring
  if (winningPlayer.currentGame === 3 && losingPlayer.currentGame === 3) {
    // No-Ad scoring: next point wins
    if (matchConfig.noAd) {
      handleGameWin(winner);
      return;
    }
    // Regular scoring: need to win by 2
    setPlayer1(prev => ({
      ...prev,
      currentGame: winner === 1 ? 4 : 3 // 4 represents 'Ad'
    }));
    setPlayer2(prev => ({
      ...prev,
      currentGame: winner === 2 ? 4 : 3
    }));
    return;
  }

  // Handle advantage situations
  if (winningPlayer.currentGame === 4) {
    handleGameWin(winner);
    return;
  }
  if (losingPlayer.currentGame === 4) {
    // Back to deuce
    setPlayer1(prev => ({ ...prev, currentGame: 3 }));
    setPlayer2(prev => ({ ...prev, currentGame: 3 }));
    return;
  }

  // Regular point scoring
  if (winningPlayer.currentGame < 3) {
    if (winner === 1) {
      setPlayer1(prev => ({ ...prev, currentGame: prev.currentGame + 1 }));
    } else {
      setPlayer2(prev => ({ ...prev, currentGame: prev.currentGame + 1 }));
    }
  } else if (losingPlayer.currentGame < 3) {
    handleGameWin(winner);
  }
};

export const handleTiebreakPoint = (
  winner: 1 | 2,
  player1: Player,
  player2: Player,
  matchConfig: MatchConfig,
  setPlayer1: (value: React.SetStateAction<Player>) => void,
  setPlayer2: (value: React.SetStateAction<Player>) => void,
  handleTiebreakWin: (winner: 1 | 2) => void,
  switchServer: () => void
) => {
  const winningPlayer = winner === 1 ? player1 : player2;
  const losingPlayer = winner === 2 ? player1 : player2;
  
  // Update tiebreak score
  if (winner === 1) {
    setPlayer1(prev => ({ ...prev, currentGame: prev.currentGame + 1 }));
  } else {
    setPlayer2(prev => ({ ...prev, currentGame: prev.currentGame + 1 }));
  }

  // Check if tiebreak is won
  const newScore = winningPlayer.currentGame + 1;
  if (newScore >= matchConfig.tiebreakPoints && 
      newScore - losingPlayer.currentGame >= 2) {
    handleTiebreakWin(winner);
  }

  // Handle serve changes
  const totalPoints = player1.currentGame + player2.currentGame + 1;
  if (totalPoints === 1) {
    // First serve change after first point
    switchServer();
  } else if (totalPoints > 1 && totalPoints % 2 === 1) {
    // Change serve every two points after that
    switchServer();
  }
};

export const handleGameWin = (
  winner: 1 | 2,
  player1: Player,
  player2: Player,
  setPlayer1: (value: React.SetStateAction<Player>) => void,
  setPlayer2: (value: React.SetStateAction<Player>) => void,
  switchServer: () => void,
  handleSetWin: (winner: 1 | 2) => void,
  startTiebreak: () => void
) => {
  // Update set score
  const currentSetGames = winner === 1 ? player1.currentSet : player2.currentSet;
  const opponentSetGames = winner === 1 ? player2.currentSet : player1.currentSet;
  
  // Reset game scores
  setPlayer1(prev => ({ ...prev, currentGame: 0 }));
  setPlayer2(prev => ({ ...prev, currentGame: 0 }));

  // Switch server for next game
  switchServer();

  // Calculate new set score
  const newSetGames = currentSetGames + 1;

  if (newSetGames === 6 && opponentSetGames <= 4) {
    // Set is won with 6 games
    if (winner === 1) {
      setPlayer1(prev => ({ ...prev, currentSet: 6 }));
      setPlayer2(prev => ({ ...prev, currentSet: opponentSetGames }));
    } else {
      setPlayer1(prev => ({ ...prev, currentSet: opponentSetGames }));
      setPlayer2(prev => ({ ...prev, currentSet: 6 }));
    }
    handleSetWin(winner);
  } else if (newSetGames === 7 && opponentSetGames === 5) {
    // Set is won 7-5
    if (winner === 1) {
      setPlayer1(prev => ({ ...prev, currentSet: 7 }));
      setPlayer2(prev => ({ ...prev, currentSet: 5 }));
    } else {
      setPlayer1(prev => ({ ...prev, currentSet: 5 }));
      setPlayer2(prev => ({ ...prev, currentSet: 7 }));
    }
    handleSetWin(winner);
  } else if (newSetGames === 6 && opponentSetGames === 6) {
    // Update scores to 6-6 before starting tiebreak
    if (winner === 1) {
      setPlayer1(prev => ({ ...prev, currentSet: 6 }));
      setPlayer2(prev => ({ ...prev, currentSet: 6 }));
    } else {
      setPlayer1(prev => ({ ...prev, currentSet: 6 }));
      setPlayer2(prev => ({ ...prev, currentSet: 6 }));
    }
    // Start tiebreak at 6-6
    startTiebreak();
  } else {
    // Update current set score
    if (winner === 1) {
      setPlayer1(prev => ({ ...prev, currentSet: newSetGames }));
    } else {
      setPlayer2(prev => ({ ...prev, currentSet: newSetGames }));
    }
  }
};

// Format player name or use default if empty
export const getDisplayName = (player: Player, defaultName: string): string => {
  return player.name.trim() || defaultName;
};

// Check if a tiebreak is won based on scores and target points
export const isTiebreakWon = (
  winningScore: number,
  losingScore: number,
  targetPoints: number
): boolean => {
  return winningScore >= targetPoints && winningScore - losingScore >= 2;
};

// Determine if server should change during tiebreak
export const shouldChangeServer = (totalPoints: number): boolean => {
  if (totalPoints === 1) {
    // First serve change after first point
    return true;
  }
  return totalPoints > 1 && totalPoints % 2 === 1;
}; 