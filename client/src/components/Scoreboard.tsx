import { useState } from 'react';
import { Player, MatchConfig, Point, ScoreboardProps } from '../types/scoreboard';
import { 
  handleRegularPoint, 
  handleGameWin,
  isTiebreakWon,
  shouldChangeServer 
} from '../utils/scoreHandlers';
import MatchConfigPanel from './MatchConfigPanel';
import ScoringControls from './ScoringControls';
import PlayerRow from './PlayerRow';

const Scoreboard = ({ onPlayerNamesChange, videoRef }: ScoreboardProps) => {
  const [player1, setPlayer1] = useState<Player>({
    name: '',
    completedSets: [],
    currentSet: 0,
    currentGame: 0,
    isServing: false
  });

  const [player2, setPlayer2] = useState<Player>({
    name: '',
    completedSets: [],
    currentSet: 0,
    currentGame: 0,
    isServing: false
  });

  const [matchConfig, setMatchConfig] = useState<MatchConfig>({
    type: 'match',
    tiebreakPoints: 7,
    noAd: false,
    inTiebreak: false,
    tiebreakFirstServer: null
  });

  const [scoringStarted, setScoringStarted] = useState(false);
  const [currentPoint, setCurrentPoint] = useState<Point>({
    startTime: null,
    endTime: null,
    winner: null
  });

  const handleNameChange = (playerNum: 1 | 2, name: string) => {
    if (playerNum === 1) {
      setPlayer1(prev => ({ ...prev, name }));
    } else {
      setPlayer2(prev => ({ ...prev, name }));
    }
    onPlayerNamesChange?.(
      playerNum === 1 ? name : player1.name,
      playerNum === 2 ? name : player2.name
    );
  };

  const setFirstServer = (playerNum: 1 | 2) => {
    setPlayer1(prev => ({ ...prev, isServing: playerNum === 1 }));
    setPlayer2(prev => ({ ...prev, isServing: playerNum === 2 }));
  };

  const handlePointWinner = (winner: 1 | 2) => {
    if (!videoRef?.current || !currentPoint.startTime) return;
    
    // Record point timing
    setCurrentPoint(prev => ({
      ...prev,
      endTime: videoRef.current!.currentTime,
      winner
    }));

    // Update score based on whether we're in a tiebreak
    if (matchConfig.type === 'tiebreak' || matchConfig.inTiebreak) {
      const totalPoints = player1.currentGame + player2.currentGame + 1;
      const newScore = winner === 1 ? player1.currentGame + 1 : player2.currentGame + 1;
      const losingScore = winner === 1 ? player2.currentGame : player1.currentGame;

      // Update tiebreak score
      if (winner === 1) {
        setPlayer1(prev => ({ ...prev, currentGame: prev.currentGame + 1 }));
      } else {
        setPlayer2(prev => ({ ...prev, currentGame: prev.currentGame + 1 }));
      }

      // Check if tiebreak is won
      if (isTiebreakWon(newScore, losingScore, matchConfig.tiebreakPoints)) {
        handleTiebreakWin(winner);
      } else if (shouldChangeServer(totalPoints)) {
        switchServer();
      }
    } else {
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


    setCurrentPoint({
      startTime: null,
      endTime: null,
      winner: null
    });
  };

  const canStartScoring = matchConfig.type !== null && (player1.isServing || player2.isServing);

  const switchServer = () => {
    setPlayer1(prev => ({ ...prev, isServing: !prev.isServing }));
    setPlayer2(prev => ({ ...prev, isServing: !prev.isServing }));
  };

  const startTiebreak = () => {
    // Determine next server after the switch
    const nextServer = player1.isServing ? 2 : 1;
    
    // Keep the current set scores (6-6) but reset game scores
    setPlayer1(prev => ({ ...prev, currentGame: 0 }));
    setPlayer2(prev => ({ ...prev, currentGame: 0 }));
    
    // Switch to tiebreak scoring mode and record who is serving first
    setMatchConfig(prev => ({
      ...prev,
      inTiebreak: true,
      tiebreakFirstServer: nextServer
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

  const handleTiebreakWin = (winner: 1 | 2) => {
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
        isServing: matchConfig.tiebreakFirstServer === 2
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
        isServing: matchConfig.tiebreakFirstServer === 1
      }));
      // Switch back to regular game mode and scoring
      setMatchConfig(prev => ({
        ...prev,
        inTiebreak: false,
        tiebreakFirstServer: null
      }));
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

  return (
    <div className="bg-white rounded-lg overflow-x-auto" style={{ boxShadow: '0 0 15px rgba(0, 0, 0, 0.1)' }}>
      {!scoringStarted ? (
        <MatchConfigPanel
          matchConfig={matchConfig}
          setMatchConfig={setMatchConfig}
          canStartScoring={canStartScoring}
          onStartScoring={() => {
            setScoringStarted(true);
          }}
        />
      ) : (
        <ScoringControls
          player1={player1}
          player2={player2}
          currentPoint={currentPoint}
          onStartPoint={handleStartPoint}
          onPointWinner={handlePointWinner}
        />
      )}

      <table className="w-full divide-y divide-gray-200">
        <tbody className="divide-y divide-gray-200">
          <PlayerRow
            player={player1}
            otherPlayer={player2}
            playerNumber={1}
            matchConfig={matchConfig}
            onNameChange={handleNameChange}
            onSetFirstServer={setFirstServer}
          />
          <PlayerRow
            player={player2}
            otherPlayer={player1}
            playerNumber={2}
            matchConfig={matchConfig}
            onNameChange={handleNameChange}
            onSetFirstServer={setFirstServer}
          />
        </tbody>
      </table>
    </div>
  );
};

export default Scoreboard; 