import { ScoreboardProps, Point } from '../types/scoreboard';
import { 
  handleRegularPoint, 
  handleGameWin,
  isTiebreakWon,
  recalculateScoreFromPoints,
  handleTiebreakPoint
} from '../utils/scoreHandlers';
import { useScoreboardState } from '../hooks/useScoreboardState';
import { useServerManagement } from '../hooks/useServerManagement';
import { usePointHandling } from '../hooks/usePointHandling';
import ScoreboardHeader from './ScoreboardHeader';
import PointsListSection from './PointsListSection';

const Scoreboard = ({ onPlayerNamesChange, videoRef }: ScoreboardProps) => {
  const {
    player1,
    setPlayer1,
    player2,
    setPlayer2,
    matchConfig,
    setMatchConfig,
    scoringStarted,
    setScoringStarted,
    pointsListExpanded,
    setPointsListExpanded,
    chronologicalPoints,
    setChronologicalPoints,
    currentPoint,
    setCurrentPoint,
    scrollToIndex,
    setScrollToIndex,
    handleNameChange
  } = useScoreboardState(onPlayerNamesChange);

  const {
    switchServer,
    setFirstServer,
    updateServerAfterTiebreak
  } = useServerManagement(setPlayer1, setPlayer2, setMatchConfig);

  const {
    startTiebreak,
    handleSetWin,
    handleTiebreakWin
  } = usePointHandling(setPlayer1, setPlayer2, setMatchConfig, updateServerAfterTiebreak);

  const handlePointWinner = (winner: 1 | 2) => {
    if (!videoRef?.current || !currentPoint.startTime) return;
    
    const pointData: Partial<Point> = {
      startTime: currentPoint.startTime,
      endTime: videoRef.current.currentTime,
      winner,
      scoreState: {
        player1: { ...player1 },
        player2: { ...player2 },
        inTiebreak: matchConfig.inTiebreak
      },
      divider: undefined
    };

    // Find insertion point based on startTime
    const insertionIndex = chronologicalPoints.points.findIndex(p => p.startTime! > pointData.startTime!);
    const newIndex = insertionIndex === -1 ? chronologicalPoints.points.length : insertionIndex;

    // Insert point and get new points array
    const newPoints: Point[] = [
      ...chronologicalPoints.points.slice(0, newIndex),
      pointData as Point,
      ...chronologicalPoints.points.slice(newIndex)
    ];

    // If point was inserted in the middle, recalculate all scores
    if (insertionIndex !== -1) {
      const initialMatchConfig = {
        ...matchConfig,
        inTiebreak: false
      };

      const { player1: newPlayer1, player2: newPlayer2, matchConfig: newMatchConfig } = 
        recalculateScoreFromPoints(newPoints, initialMatchConfig);

      // Update each point's scoreState with the recalculated scores
      const updatedPoints = newPoints.map((point, index) => {
        const prevPoints = newPoints.slice(0, index);
        const { player1, player2, matchConfig } = recalculateScoreFromPoints(prevPoints, initialMatchConfig);

        // Determine if this point should have a divider
        let divider: Point['divider'] = undefined;
        const winningPlayer = point.winner === 1 ? player1 : player2;
        const losingPlayer = point.winner === 1 ? player2 : player1;

        if (matchConfig.type === 'tiebreak' || matchConfig.inTiebreak) {
          // Check for tiebreak win
          const winner = point.winner!;
          const winnerGame = winner === 1 ? player1.currentGame + 1 : player2.currentGame + 1;
          const loserGame = winner === 1 ? player2.currentGame : player1.currentGame;
          if (isTiebreakWon(winnerGame, loserGame, matchConfig.tiebreakPoints)) {
            divider = 'tiebreak';
          }
        } else {
          // Check for game win
          const isGameWin = (winningPlayer.currentGame === 3 && losingPlayer.currentGame < 3) || // Regular win
                           (winningPlayer.currentGame === 4) || // Win from advantage
                           (winningPlayer.currentGame === 3 && losingPlayer.currentGame === 3 && matchConfig.noAd); // No-ad win

          if (isGameWin) {
            // Calculate what the score will be after this game
            const newSetGames = winningPlayer.currentSet + 1;
            const opponentSetGames = losingPlayer.currentSet;

            if (newSetGames === 6 && opponentSetGames <= 4) {
              divider = 'set'; // Set win at 6-4 or better
            } else if (newSetGames === 7 && opponentSetGames === 5) {
              divider = 'set'; // Set win at 7-5
            } else if (newSetGames === 6 && opponentSetGames === 6) {
              divider = 'tiebreak-start'; // Score reaches 6-6
            } else {
              divider = 'game'; // Regular game win
            }
          }
        }

        return {
          ...point,
          scoreState: {
            player1,
            player2,
            inTiebreak: matchConfig.inTiebreak
          },
          divider
        } as Point;
      });

      // Update chronological points with recalculated states
      setChronologicalPoints({
        points: updatedPoints,
        currentIndex: newIndex
      });
      setScrollToIndex(newIndex);

      // Update all states
      setPlayer1(newPlayer1);
      setPlayer2(newPlayer2);
      setMatchConfig(newMatchConfig);
    } else {
      // Point was added at the end, determine if it should have a divider
      if (matchConfig.type === 'tiebreak' || matchConfig.inTiebreak) {
        const tiebreakWon = handleTiebreakPoint(
          winner,
          player1,
          player2,
          matchConfig,
          setPlayer1,
          setPlayer2,
          (winner) => handleTiebreakWin(winner, matchConfig, player1, player2),
          switchServer
        );
        if (tiebreakWon) {
          pointData.divider = 'tiebreak';
        }
      } else {
        const winningPlayer = winner === 1 ? player1 : player2;
        const losingPlayer = winner === 1 ? player2 : player1;

        // Check for game win
        const isGameWin = (winningPlayer.currentGame === 3 && losingPlayer.currentGame < 3) || // Regular win
                         (winningPlayer.currentGame === 4) || // Win from advantage
                         (winningPlayer.currentGame === 3 && losingPlayer.currentGame === 3 && matchConfig.noAd); // No-ad win

        if (isGameWin) {
          // Calculate what the score will be after this game
          const newSetGames = winningPlayer.currentSet + 1;
          const opponentSetGames = losingPlayer.currentSet;

          if (newSetGames === 6 && opponentSetGames <= 4) {
            pointData.divider = 'set'; // Set win at 6-4 or better
          } else if (newSetGames === 7 && opponentSetGames === 5) {
            pointData.divider = 'set'; // Set win at 7-5
          } else if (newSetGames === 6 && opponentSetGames === 6) {
            pointData.divider = 'tiebreak-start'; // Score reaches 6-6
          } else {
            pointData.divider = 'game'; // Regular game win
          }
        }

        handleRegularPoint(
          winner,
          player1,
          player2,
          matchConfig,
          setPlayer1,
          setPlayer2,
          (winner) => handleGameWin(
            winner,
            player1,
            player2,
            setPlayer1,
            setPlayer2,
            switchServer,
            handleSetWin,
            startTiebreak
          )
        );
      }

      // Update chronological points when adding at the end
      setChronologicalPoints({
        points: newPoints,
        currentIndex: newIndex
      });
      setScrollToIndex(newIndex);
    }

    setCurrentPoint({
      startTime: null,
      endTime: null,
      winner: null
    });
  };

  const handleStartPoint = () => {
    if (!videoRef?.current) return;
    // In tiebreak mode, don't allow starting a point unless a server is selected
    if (matchConfig.type === 'tiebreak' && !player1.isServing && !player2.isServing) return;
    
    setCurrentPoint({
      startTime: videoRef.current.currentTime,
      endTime: null,
      winner: null
    });
  };

  const canStartScoring = matchConfig.type !== null && (player1.isServing || player2.isServing);

  return (
    <div className="flex flex-col h-full">
      <ScoreboardHeader
        scoringStarted={scoringStarted}
        matchConfig={matchConfig}
        setMatchConfig={setMatchConfig}
        canStartScoring={canStartScoring}
        onStartScoring={() => setScoringStarted(true)}
        player1={player1}
        player2={player2}
        currentPoint={currentPoint}
        onStartPoint={handleStartPoint}
        onPointWinner={handlePointWinner}
        onNameChange={handleNameChange}
        onSetFirstServer={setFirstServer}
      />

      {scoringStarted && (
        <PointsListSection
          expanded={pointsListExpanded}
          onExpandToggle={() => setPointsListExpanded(prev => !prev)}
          chronologicalPoints={chronologicalPoints}
          player1={player1}
          player2={player2}
          scrollToIndex={scrollToIndex}
          matchConfig={matchConfig}
          onScrollComplete={() => setScrollToIndex(undefined)}
        />
      )}
    </div>
  );
};

export default Scoreboard; 