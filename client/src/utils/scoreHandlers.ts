import { Player, MatchConfig, Point } from '../types/scoreboard';

// =============================================================================
// CORE POINT HANDLING
// Functions for handling individual points in different game modes
// =============================================================================

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
): boolean => {
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
    return true;
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

  return false;
};

// =============================================================================
// GAME AND SET MANAGEMENT
// Functions for managing game and set transitions
// =============================================================================

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

// =============================================================================
// STATE CALCULATIONS
// Functions for calculating and managing game state
// =============================================================================

// =============================================================================
// STATE CALCULATION HELPERS
// Internal helper functions for state calculations
// =============================================================================

const handleTiebreakPointState = (
  winner: 1 | 2,
  player1: Player,
  player2: Player,
  matchConfig: MatchConfig
): { player1: Player, player2: Player, matchConfig: MatchConfig } => {
  const winningPlayer = winner === 1 ? player1 : player2;
  const losingPlayer = winner === 1 ? player2 : player1;
  
  // Update tiebreak score
  winningPlayer.currentGame += 1;
  const totalPoints = player1.currentGame + player2.currentGame;

  if (isTiebreakWon(winningPlayer.currentGame, losingPlayer.currentGame, matchConfig.tiebreakPoints)) {
    if (matchConfig.type === 'match') {
      player1.completedSets.push({
        score: winner === 1 ? 7 : 6,
        tiebreakScore: player1.currentGame,
        wonSet: winner === 1
      });
      player2.completedSets.push({
        score: winner === 2 ? 7 : 6,
        tiebreakScore: player2.currentGame,
        wonSet: winner === 2
      });
      matchConfig.inTiebreak = false;
      const nextServer = calculateServer(matchConfig, player1, player2, true);
      player1.isServing = nextServer === 1;
      player2.isServing = nextServer === 2;
      player1.currentSet = 0;
      player2.currentSet = 0;
    } else {
      player1.completedSets.push({
        score: player1.currentGame,
        wonSet: winner === 1
      });
      player2.completedSets.push({
        score: player2.currentGame,
        wonSet: winner === 2
      });
      player1.isServing = false;
      player2.isServing = false;
    }
    player1.currentGame = 0;
    player2.currentGame = 0;
  } else if (shouldChangeServer(totalPoints)) {
    const wasPlayer1Serving = player1.isServing;
    player1.isServing = !wasPlayer1Serving;
    player2.isServing = wasPlayer1Serving;
  }

  return { player1, player2, matchConfig };
};

const handleRegularPointState = (
  winner: 1 | 2,
  player1: Player,
  player2: Player,
  matchConfig: MatchConfig
): { player1: Player, player2: Player, matchConfig: MatchConfig } => {
  const winningPlayer = winner === 1 ? player1 : player2;
  const losingPlayer = winner === 1 ? player2 : player1;

  // Update game score
  if (winningPlayer.currentGame === 3 && losingPlayer.currentGame === 3) {
    if (matchConfig.noAd) {
      winningPlayer.currentGame += 1;
    } else {
      winningPlayer.currentGame = 4;
      losingPlayer.currentGame = 3;
    }
  } else if (winningPlayer.currentGame === 4) {
    winningPlayer.currentGame += 1;
  } else if (losingPlayer.currentGame === 4) {
    winningPlayer.currentGame = 3;
    losingPlayer.currentGame = 3;
  } else if (winningPlayer.currentGame === 3) {
    winningPlayer.currentGame += 1;
  } else {
    winningPlayer.currentGame += 1;
  }

  const isGameWin = (winningPlayer.currentGame === 4 && losingPlayer.currentGame < 3) ||
                   (winningPlayer.currentGame === 5) ||
                   (winningPlayer.currentGame === 4 && losingPlayer.currentGame === 3 && matchConfig.noAd);

  if (isGameWin) {
    const result = handleGameWinState(winner, player1, player2, matchConfig);
    player1 = result.player1;
    player2 = result.player2;
    matchConfig = result.matchConfig;
  }

  return { player1, player2, matchConfig };
};

const handleGameWinState = (
  winner: 1 | 2,
  player1: Player,
  player2: Player,
  matchConfig: MatchConfig
): { player1: Player, player2: Player, matchConfig: MatchConfig } => {
  const winningPlayer = winner === 1 ? player1 : player2;
  const losingPlayer = winner === 1 ? player2 : player1;

  winningPlayer.currentSet += 1;
  player1.currentGame = 0;
  player2.currentGame = 0;
  
  const wasPlayer1Serving = player1.isServing;
  player1.isServing = !wasPlayer1Serving;
  player2.isServing = wasPlayer1Serving;

  if (winningPlayer.currentSet === 6 && losingPlayer.currentSet <= 4) {
    handleSetCompletion(winner, player1, player2);
  } else if (winningPlayer.currentSet === 7 && losingPlayer.currentSet === 5) {
    handleSetCompletion(winner, player1, player2);
  } else if (winningPlayer.currentSet === 6 && losingPlayer.currentSet === 6) {
    matchConfig.inTiebreak = true;
  }

  return { player1, player2, matchConfig };
};

const handleSetCompletion = (winner: 1 | 2, player1: Player, player2: Player) => {
  player1.completedSets.push({
    score: player1.currentSet,
    wonSet: winner === 1
  });
  player2.completedSets.push({
    score: player2.currentSet,
    wonSet: winner === 2
  });
  player1.currentSet = 0;
  player2.currentSet = 0;
};

export const calculateScoreState = (
  input: Point[] | { winner: 1 | 2 },
  initialState: {
    player1: Player,
    player2: Player,
    matchConfig: MatchConfig
  }
): {
  player1: Player,
  player2: Player,
  matchConfig: MatchConfig,
  allStates?: { player1: Player, player2: Player, matchConfig: MatchConfig }[]
} => {
  // Initialize state by cloning
  const player1: Player = JSON.parse(JSON.stringify(initialState.player1));
  const player2: Player = JSON.parse(JSON.stringify(initialState.player2));
  const matchConfig: MatchConfig = JSON.parse(JSON.stringify(initialState.matchConfig));
  const allStates: { player1: Player, player2: Player, matchConfig: MatchConfig }[] = [];

  // Handle single point case
  if (!Array.isArray(input)) {
    if (matchConfig.type === 'tiebreak' || matchConfig.inTiebreak) {
      return handleTiebreakPointState(input.winner, player1, player2, matchConfig);
    } else {
      return handleRegularPointState(input.winner, player1, player2, matchConfig);
    }
  }

  // Process multiple points
  input.forEach((point) => {
    let result;
    if (matchConfig.type === 'tiebreak' || matchConfig.inTiebreak) {
      result = handleTiebreakPointState(point.winner!, player1, player2, matchConfig);
    } else {
      result = handleRegularPointState(point.winner!, player1, player2, matchConfig);
    }

    // Update states
    Object.assign(player1, result.player1);
    Object.assign(player2, result.player2);
    Object.assign(matchConfig, result.matchConfig);

    // Store state after this point
    allStates.push({
      player1: JSON.parse(JSON.stringify(player1)),
      player2: JSON.parse(JSON.stringify(player2)),
      matchConfig: JSON.parse(JSON.stringify(matchConfig))
    });
  });

  return {
    player1,
    player2,
    matchConfig,
    allStates
  };
};

// =============================================================================
// SERVER MANAGEMENT
// Functions for determining and managing server state
// =============================================================================

export const calculateServer = (
  matchConfig: MatchConfig, 
  player1: Player, 
  player2: Player, 
  tiebreakWon: boolean
): 1 | 2 => {
  // Server calculation based on tennis rules
  let result: 1 | 2;
  
  // Determine second server based on firstServer
  const secondServer = matchConfig.firstServer === 1 ? 2 : 1;
  
  // Calculate total points for tiebreak server calculation
  const totalPoints = player1.currentGame + player2.currentGame;
  
  // For tiebreak-only mode
  if (matchConfig.type === 'tiebreak') {
    result = shouldChangeServer(totalPoints) 
      ? (player1.isServing ? 2 : 1) 
      : (player1.isServing ? 1 : 2);
    return result;
  }
  
  // Calculate total games
  const totalGames = getTotalGamesWon(player1) + getTotalGamesWon(player2);
  
  // Special handling for completed tiebreak
  if (tiebreakWon) {
    // After a tiebreak is completed, the player who received first in the tiebreak serves first in the next set
    // We need to determine who served first in the tiebreak
    
    // Get the last set
    const lastSetIndex = player1.completedSets.length - 1;
    if (lastSetIndex < 0) return matchConfig.firstServer || 1; // Fallback if no completed sets
    
    // Calculate total games in the last set (both players combined)
    const lastSetGames = player1.completedSets[lastSetIndex].score + player2.completedSets[lastSetIndex].score;
    
    // The server at the start of the tiebreak is determined by who would have served in the next game
    // This is the player who did NOT serve in the 12th game (when score was 6-6)
    // In a normal set with 12 games, this would be the player who served in odd-numbered games
    const tiebreakFirstServer = (lastSetGames % 2 === 0) ? secondServer : matchConfig.firstServer;

    // After the tiebreak, the first server of the next set is the player who received first in the tiebreak
    // This is the player who did NOT serve first in the tiebreak
    result = tiebreakFirstServer === 1 ? 2 : 1;
    return result;
  }
  
  // For ongoing tiebreak
  if (matchConfig.inTiebreak) {
    result = shouldChangeServer(totalPoints) 
      ? (player1.isServing ? 2 : 1) 
      : (player1.isServing ? 1 : 2);
    return result;
  }
  
  // For regular games
  result = (totalGames % 2 === 0) ? matchConfig.firstServer! : secondServer;
  return result;
};

export const shouldChangeServer = (totalPoints: number): boolean => {
  if (totalPoints === 1) {
    // First serve change after first point
    return true;
  }
  return totalPoints > 1 && totalPoints % 2 === 1;
};

// =============================================================================
// UTILITY FUNCTIONS
// Helper functions for scoring and display
// =============================================================================

export const getDisplayName = (player: Player, defaultName: string): string => {
  return player.name.trim() || defaultName;
};

export const getTotalGamesWon = (player: Player): number => {
  // Sum games from completed sets only
  const completedSetsGames = player.completedSets.reduce((total, set) => {
    // For each completed set, add the games won (stored in score)
    return total + set.score;
  }, 0);

  // We don't add games from current set since we're only interested in
  // completed games for determining server order
  // const totalGames = completedSetsGames + player.currentSet;
  
  return completedSetsGames;
};

export const isTiebreakWon = (
  winningScore: number,
  losingScore: number,
  targetPoints: number
): boolean => {
  return winningScore >= targetPoints && winningScore - losingScore >= 2;
}; 