import { Player, MatchConfig, Point } from '../types/scoreboard';
import MatchConfigPanel from './MatchConfigPanel';
import ScoringControls from './ScoringControls';
import PlayerRow from './PlayerRow';

interface ScoreboardHeaderProps {
  scoringStarted: boolean;
  matchConfig: MatchConfig;
  setMatchConfig: React.Dispatch<React.SetStateAction<MatchConfig>>;
  canStartScoring: boolean;
  onStartScoring: () => void;
  player1: Player;
  player2: Player;
  currentPoint: Point;
  onStartPoint: () => void;
  onPointWinner: (winner: 1 | 2) => void;
  onNameChange: (player: 1 | 2, name: string) => void;
  onSetFirstServer: (player: 1 | 2) => void;
  currentVideoTime: number;
  isTimeInExistingPoint: (time: number, excludeIndex?: number) => boolean;
  showEditButton: boolean;
  onEditClick: () => void;
  onDeleteClick: () => void;
  isEditing: boolean;
  editingPoint: Point | null;
  onSaveEdit: (index: number, updatedPoint: Point) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  points: Point[];
  editingPointIndex: number | null;
}

const ScoreboardHeader = ({
  scoringStarted,
  matchConfig,
  setMatchConfig,
  canStartScoring,
  onStartScoring,
  player1,
  player2,
  currentPoint,
  onStartPoint,
  onPointWinner,
  onNameChange,
  onSetFirstServer,
  currentVideoTime,
  isTimeInExistingPoint,
  showEditButton,
  onEditClick,
  onDeleteClick,
  isEditing,
  editingPoint,
  onSaveEdit,
  videoRef,
  points,
  editingPointIndex
}: ScoreboardHeaderProps) => {
  return (
    <div className="bg-white rounded-lg overflow-x-auto" style={{ boxShadow: '0 0 15px rgba(0, 0, 0, 0.1)' }}>
      {!scoringStarted ? (
        <MatchConfigPanel
          matchConfig={matchConfig}
          setMatchConfig={setMatchConfig}
          canStartScoring={canStartScoring}
          onStartScoring={onStartScoring}
        />
      ) : (
        <ScoringControls
          player1={player1}
          player2={player2}
          currentPoint={currentPoint}
          onStartPoint={onStartPoint}
          onPointWinner={onPointWinner}
          currentVideoTime={currentVideoTime}
          isTimeInExistingPoint={isTimeInExistingPoint}
          showEditButton={showEditButton}
          onEditClick={onEditClick}
          onDeleteClick={onDeleteClick}
          isEditing={isEditing}
          editingPoint={editingPoint}
          onSaveEdit={onSaveEdit}
          videoRef={videoRef}
          points={points}
          editingPointIndex={editingPointIndex}
        />
      )}

      <table className="w-full divide-y divide-gray-200">
        <tbody className="divide-y divide-gray-200">
          <PlayerRow
            player={player1}
            otherPlayer={player2}
            playerNumber={1}
            matchConfig={matchConfig}
            onNameChange={onNameChange}
            onSetFirstServer={onSetFirstServer}
          />
          <PlayerRow
            player={player2}
            otherPlayer={player1}
            playerNumber={2}
            matchConfig={matchConfig}
            onNameChange={onNameChange}
            onSetFirstServer={onSetFirstServer}
          />
        </tbody>
      </table>
    </div>
  );
};

export default ScoreboardHeader; 