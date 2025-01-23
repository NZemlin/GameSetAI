import { MatchConfig } from '../types/scoreboard';

interface MatchConfigPanelProps {
  matchConfig: MatchConfig;
  setMatchConfig: (value: React.SetStateAction<MatchConfig>) => void;
  canStartScoring: boolean;
  onStartScoring: () => void;
}

const MatchConfigPanel = ({ 
  matchConfig, 
  setMatchConfig, 
  canStartScoring,
  onStartScoring 
}: MatchConfigPanelProps) => {
  return (
    <div className="p-4 border-b border-gray-200">
      <div className="space-y-4">
        {/* Match Type Selection */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Match Type:</span>
          <div className="space-x-2">
            <button
              onClick={() => setMatchConfig(prev => ({
                ...prev,
                type: 'match'
              }))}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                matchConfig.type === 'match'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Full Match
            </button>
            <button
              onClick={() => setMatchConfig(prev => ({ 
                ...prev, 
                type: 'tiebreak'
              }))}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                matchConfig.type === 'tiebreak'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Tiebreak Only
            </button>
          </div>
        </div>

        {/* Tiebreak Points Selection - Always visible */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Tiebreak Points:</span>
          <div className="space-x-2">
            <button
              onClick={() => setMatchConfig(prev => ({ ...prev, tiebreakPoints: 7 }))}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                matchConfig.tiebreakPoints === 7
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              First to 7
            </button>
            <button
              onClick={() => setMatchConfig(prev => ({ ...prev, tiebreakPoints: 10 }))}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                matchConfig.tiebreakPoints === 10
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              First to 10
            </button>
          </div>
        </div>

        {/* Scoring System - Always visible but disabled in tiebreak mode */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Scoring System:</span>
          <div className="space-x-2">
            <button
              onClick={() => matchConfig.type === 'match' && setMatchConfig(prev => ({ ...prev, noAd: false }))}
              disabled={matchConfig.type === 'tiebreak'}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                !matchConfig.noAd
                  ? matchConfig.type === 'match' ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : matchConfig.type === 'match' ? 'text-gray-700 bg-gray-100 hover:bg-gray-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Regular
            </button>
            <button
              onClick={() => matchConfig.type === 'match' && setMatchConfig(prev => ({ ...prev, noAd: true }))}
              disabled={matchConfig.type === 'tiebreak'}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                matchConfig.noAd
                  ? matchConfig.type === 'match' ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : matchConfig.type === 'match' ? 'text-gray-700 bg-gray-100 hover:bg-gray-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              No Ad
            </button>
          </div>
        </div>

        {/* Start Scoring Button */}
        {canStartScoring && (
          <div className="flex justify-center pt-4">
            <button
              onClick={onStartScoring}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-indigo-500 shadow-sm"
            >
              Start Scoring
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchConfigPanel; 