import { useState } from 'react';

interface Player {
  name: string;
  sets: number[];
  currentGame: number;
  isServing?: boolean;
}

interface MatchConfig {
  type: 'match' | 'tiebreak' | null;
  tiebreakPoints: 7 | 10;
  noAd: boolean;
}

interface Point {
  startTime: number | null;
  endTime: number | null;
  winner: 1 | 2 | null;
}

interface ScoreboardProps {
  onPlayerNamesChange?: (player1: string, player2: string) => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

const Scoreboard = ({ onPlayerNamesChange, videoRef }: ScoreboardProps) => {
  const [player1, setPlayer1] = useState<Player>({
    name: '',
    sets: [],
    currentGame: 0,
    isServing: false
  });

  const [player2, setPlayer2] = useState<Player>({
    name: '',
    sets: [],
    currentGame: 0,
    isServing: false
  });

  const [matchConfig, setMatchConfig] = useState<MatchConfig>({
    type: 'match',
    tiebreakPoints: 7,
    noAd: false
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

  // Convert game score number to tennis scoring format
  const formatGameScore = (score: number): string => {
    switch (score) {
      case 0: return '0';
      case 1: return '15';
      case 2: return '30';
      case 3: return '40';
      default: return score.toString();
    }
  };

  const handleStartPoint = () => {
    if (!videoRef?.current) return;
    setCurrentPoint({
      startTime: videoRef.current.currentTime,
      endTime: null,
      winner: null
    });
  };

  const handlePointWinner = (winner: 1 | 2) => {
    if (!videoRef?.current || !currentPoint.startTime) return;
    setCurrentPoint(prev => ({
      ...prev,
      endTime: videoRef.current!.currentTime,
      winner
    }));
    // TODO: Save the completed point
    console.log('Point completed:', {
      ...currentPoint,
      endTime: videoRef.current.currentTime,
      winner
    });
    // Reset for next point
    setCurrentPoint({
      startTime: null,
      endTime: null,
      winner: null
    });
  };

  const canStartScoring = matchConfig.type !== null && (player1.isServing || player2.isServing);

  return (
    <div className="bg-white rounded-lg overflow-x-auto" style={{ boxShadow: '0 0 15px rgba(0, 0, 0, 0.1)' }}>
      {!scoringStarted ? (
        <div className="p-4 border-b border-gray-200">
          <div className="space-y-4">
            {/* Match Type Selection */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Match Type:</span>
              <div className="space-x-2">
                <button
                  onClick={() => setMatchConfig(prev => ({ ...prev, type: 'match' }))}
                  className={`inline-flex items-center px-2 py-1 border ${
                    matchConfig.type === 'match'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 text-gray-700'
                  } text-sm font-medium rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm`}
                >
                  Full Match
                </button>
                <button
                  onClick={() => setMatchConfig(prev => ({ ...prev, type: 'tiebreak' }))}
                  className={`inline-flex items-center px-2 py-1 border ${
                    matchConfig.type === 'tiebreak'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 text-gray-700'
                  } text-sm font-medium rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm`}
                >
                  Tiebreak Only
                </button>
              </div>
            </div>

            {/* Tiebreak Points Selection */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Tiebreak Points:</span>
              <div className="space-x-2">
                <button
                  onClick={() => setMatchConfig(prev => ({ ...prev, tiebreakPoints: 7 }))}
                  className={`inline-flex items-center px-2 py-1 border ${
                    matchConfig.tiebreakPoints === 7
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 text-gray-700'
                  } text-sm font-medium rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm`}
                >
                  7 Points
                </button>
                <button
                  onClick={() => setMatchConfig(prev => ({ ...prev, tiebreakPoints: 10 }))}
                  className={`inline-flex items-center px-2 py-1 border ${
                    matchConfig.tiebreakPoints === 10
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 text-gray-700'
                  } text-sm font-medium rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm`}
                >
                  10 Points
                </button>
              </div>
            </div>

            {/* Scoring System Selection */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Scoring System:</span>
              <div className="space-x-2">
                <button
                  onClick={() => setMatchConfig(prev => ({ ...prev, noAd: false }))}
                  className={`inline-flex items-center px-2 py-1 border ${
                    !matchConfig.noAd
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 text-gray-700'
                  } text-sm font-medium rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm`}
                >
                  Regular
                </button>
                <button
                  onClick={() => setMatchConfig(prev => ({ ...prev, noAd: true }))}
                  className={`inline-flex items-center px-2 py-1 border ${
                    matchConfig.noAd
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 text-gray-700'
                  } text-sm font-medium rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm`}
                >
                  No Ad
                </button>
              </div>
            </div>

            {/* Start Scoring Button */}
            {canStartScoring && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => {
                    setScoringStarted(true);
                    console.log('Starting scoring with config:', matchConfig);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
                >
                  Start Scoring
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center space-x-4">
            <button
              onClick={handleStartPoint}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-sm"
            >
              Start Point
            </button>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePointWinner(1)}
                disabled={!currentPoint.startTime}
                className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm ${
                  !currentPoint.startTime
                    ? 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed'
                    : 'border-transparent text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }`}
              >
                {player1.name || 'Player 1'} Point
              </button>
              <button
                onClick={() => handlePointWinner(2)}
                disabled={!currentPoint.startTime}
                className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md shadow-sm ${
                  !currentPoint.startTime
                    ? 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed'
                    : 'border-transparent text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }`}
              >
                {player2.name || 'Player 2'} Point
              </button>
            </div>
          </div>
        </div>
      )}

      <table className="w-full divide-y divide-gray-200">
        <tbody className="divide-y divide-gray-200">
          {/* Player 1 Row */}
          <tr>
            <td className="px-3 py-2 whitespace-nowrap">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={player1.name}
                  onChange={(e) => handleNameChange(1, e.target.value)}
                  placeholder="Player 1"
                  className="focus:outline-none bg-transparent text-gray-900 placeholder-gray-500 w-full"
                />
                {player1.isServing && (
                  <div className="w-2 h-2 rounded-full bg-[#10B981]" title="Currently Serving" />
                )}
                {!player1.isServing && !player2.isServing && (
                  <button
                    onClick={() => setFirstServer(1)}
                    className="inline-flex items-center px-2 py-1 border border-gray-300 text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
                    title="Set as First Server"
                  >
                    Serve First
                  </button>
                )}
              </div>
            </td>
            {player1.sets.map((set, index) => (
              <td key={index} className="px-3 py-2 whitespace-nowrap text-center text-gray-900">
                {set}
              </td>
            ))}
            {player1.sets.length < 5 && (
              <td className="px-3 py-2 whitespace-nowrap text-center text-gray-900">
                0
              </td>
            )}
            <td className="px-3 py-2 whitespace-nowrap text-center text-gray-900">
              {formatGameScore(player1.currentGame)}
            </td>
          </tr>
          {/* Player 2 Row */}
          <tr>
            <td className="px-3 py-2 whitespace-nowrap">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={player2.name}
                  onChange={(e) => handleNameChange(2, e.target.value)}
                  placeholder="Player 2"
                  className="focus:outline-none bg-transparent text-gray-900 placeholder-gray-500 w-full"
                />
                {player2.isServing && (
                  <div className="w-2 h-2 rounded-full bg-[#10B981]" title="Currently Serving" />
                )}
                {!player1.isServing && !player2.isServing && (
                  <button
                    onClick={() => setFirstServer(2)}
                    className="inline-flex items-center px-2 py-1 border border-gray-300 text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
                    title="Set as First Server"
                  >
                    Serve First
                  </button>
                )}
              </div>
            </td>
            {player2.sets.map((set, index) => (
              <td key={index} className="px-3 py-2 whitespace-nowrap text-center text-gray-900">
                {set}
              </td>
            ))}
            {player2.sets.length < 5 && (
              <td className="px-3 py-2 whitespace-nowrap text-center text-gray-900">
                0
              </td>
            )}
            <td className="px-3 py-2 whitespace-nowrap text-center text-gray-900">
              {formatGameScore(player2.currentGame)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default Scoreboard; 