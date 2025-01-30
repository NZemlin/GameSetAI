import { Point, Player, MatchConfig } from '../types/scoreboard';
import { 
  handleRegularPoint, 
  handleGameWin,
  handleTiebreakPoint,
  calculateScoreState
} from '../utils/scoreHandlers';
import { useScoreboardState } from '../hooks/useScoreboardState';
import { useServerManagement } from '../hooks/useServerManagement';
import { usePointHandling } from '../hooks/usePointHandling';
import ScoreboardHeader from './ScoreboardHeader';
import PointsListSection from './PointsListSection';
import { useEffect, useState, useMemo } from 'react';

interface ScoreboardComponentProps {
  onPlayerNamesChange: (player1: string, player2: string) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  onPointsChange?: (points: Point[]) => void;
}

const Scoreboard = ({ onPlayerNamesChange, videoRef, onPointsChange }: ScoreboardComponentProps) => {
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

  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  
  // Update video time and handle scrolling
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      const currentTime = video.currentTime;
      setCurrentVideoTime(currentTime);
      
      // Find point that contains current time
      const pointIndex = chronologicalPoints.points.findIndex(point => 
        point.startTime !== null &&
        point.endTime !== null &&
        currentTime >= point.startTime &&
        currentTime <= point.endTime
      );

      // If not found in a point's range, find the last point that starts before current time
      const lastPointBeforeTime = [...chronologicalPoints.points]
        .reverse()
        .findIndex((point: Point) => 
          point.startTime !== null && point.startTime <= currentTime
        );
      
      const targetIndex = pointIndex !== -1 ? pointIndex : 
        (lastPointBeforeTime !== -1 ? chronologicalPoints.points.length - 1 - lastPointBeforeTime : -1);

      if (targetIndex !== -1) {
        setScrollToIndex(targetIndex);
      }
    };

    // Listen for both timeupdate and seeked events
    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('seeked', updateTime);
    
    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('seeked', updateTime);
    };
  }, [videoRef, chronologicalPoints.points, setScrollToIndex]);

  // Filter points up to current video time
  const filteredPoints = useMemo(() => {
    return chronologicalPoints.points.filter(point => 
      point.endTime !== null && 
      point.endTime <= currentVideoTime
    );
  }, [chronologicalPoints.points, currentVideoTime]);

  // Calculate current score based on filtered points
  const currentScoreState = useMemo(() => {
    const initialMatchConfig = {
      ...matchConfig,
      inTiebreak: false
    };

    // Create fresh initial state with correct server initialization
    const initialState = {
      player1: { 
        ...player1,
        currentGame: 0,
        currentSet: 0,
        completedSets: [],
        isServing: matchConfig.firstServer === 1  // Initialize server based on firstServer
      },
      player2: { 
        ...player2,
        currentGame: 0,
        currentSet: 0,
        completedSets: [],
        isServing: matchConfig.firstServer === 2  // Initialize server based on firstServer
      },
      matchConfig: initialMatchConfig
    };

    // If no points, return initial state
    if (filteredPoints.length === 0) {
      return initialState;
    }

    // Calculate score state based on filtered points
    const { player1: currentPlayer1, player2: currentPlayer2, matchConfig: currentMatchConfig } = 
      calculateScoreState(filteredPoints, initialState);

    return {
      player1: currentPlayer1,
      player2: currentPlayer2,
      matchConfig: currentMatchConfig
    };
  }, [filteredPoints, matchConfig, player1, player2]);

  // Helper to check if time is within existing points
  const isTimeInExistingPoint = (time: number) => {
    return chronologicalPoints.points.some(point => 
      point.startTime !== null &&
      point.endTime !== null &&
      time >= point.startTime &&
      time <= point.endTime
    );
  };

  // Notify parent component when points change
  useEffect(() => {
    onPointsChange?.(chronologicalPoints.points);
  }, [chronologicalPoints.points, onPointsChange]);

  const calculateDivider = (state: { player1: Player, player2: Player, matchConfig: MatchConfig }) => {
    let divider: Point['divider'] = undefined;
    if (state.player1.currentGame === 0 && state.player2.currentGame === 0) {
      if (state.matchConfig.type === 'tiebreak') {
        divider = 'tiebreak';
      } else if (state.player1.currentSet === 0 && state.player2.currentSet === 0) {
        divider = 'set';
      } else if (state.player1.currentSet === 6 && state.player2.currentSet === 6) {
        divider = 'tiebreak-start';
      } else {
        divider = 'game';
      }
    }
    return divider;
  };

  const handlePointWinner = (winner: 1 | 2) => {
    if (!videoRef?.current || !currentPoint.startTime) return;
    const currentTime = videoRef.current.currentTime;

    // Validate time constraints
    if (currentTime <= currentPoint.startTime) {
      console.warn("End time must be after start time");
      return;
    }
    if (isTimeInExistingPoint(currentTime)) {
      console.warn("Cannot record point within existing point range");
      return;
    }
    
    const pointData: Partial<Point> = {
      startTime: currentPoint.startTime,
      endTime: currentTime,
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
      player1.isServing = matchConfig.firstServer === 1;
      player2.isServing = matchConfig.firstServer === 2;
      const { player1: newPlayer1, player2: newPlayer2, matchConfig: newMatchConfig, allStates = [] } = 
        calculateScoreState(newPoints, { 
          player1: { ...player1, currentGame: 0, currentSet: 0, completedSets: [] },
          player2: { ...player2, currentGame: 0, currentSet: 0, completedSets: [] },
          matchConfig: initialMatchConfig 
        });

      // Update each point's scoreState with the precomputed states
      const updatedPoints = newPoints.map((point, index) => {
        const state = allStates[index];
        
        // Determine if this point should have a divider
        const divider: Point['divider'] = calculateDivider(state);

        return {
          ...point,
          scoreState: {
            player1: state.player1,
            player2: state.player2,
            inTiebreak: state.matchConfig.inTiebreak
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
      // Point was added at the end, calculate the state after this point
      const afterPointState = calculateScoreState(
        { winner },
        { player1, player2, matchConfig }
      );

      // Use the after-point state for the point's scoreState
      pointData.scoreState = {
        player1: afterPointState.player1,
        player2: afterPointState.player2,
        inTiebreak: afterPointState.matchConfig.inTiebreak
      };

      pointData.divider = calculateDivider(afterPointState);

      // Then proceed with the actual state updates
      if (matchConfig.type === 'tiebreak' || matchConfig.inTiebreak) {
        handleTiebreakPoint(
          winner,
          player1,
          player2,
          matchConfig,
          setPlayer1,
          setPlayer2,
          (winner) => handleTiebreakWin(winner, matchConfig, player1, player2),
          switchServer
        );
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
    const currentTime = videoRef.current.currentTime;
    
    // Prevent starting in existing point
    if (isTimeInExistingPoint(currentTime)) {
      console.warn("Cannot start point within existing point range");
      return;
    }
    
    // In tiebreak mode, don't allow starting a point unless a server is selected
    if (matchConfig.type === 'tiebreak' && !player1.isServing && !player2.isServing) return;
    
    setCurrentPoint({
      startTime: currentTime,
      endTime: null,
      winner: null
    });
  };

  const canStartScoring = matchConfig.type !== null && (player1.isServing || player2.isServing);

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScoreboardHeader
        scoringStarted={scoringStarted}
        matchConfig={currentScoreState.matchConfig}
        setMatchConfig={setMatchConfig}
        canStartScoring={canStartScoring}
        onStartScoring={() => setScoringStarted(true)}
        player1={currentScoreState.player1}
        player2={currentScoreState.player2}
        currentPoint={currentPoint}
        onStartPoint={handleStartPoint}
        onPointWinner={handlePointWinner}
        onNameChange={handleNameChange}
        onSetFirstServer={setFirstServer}
        currentVideoTime={currentVideoTime}
        isTimeInExistingPoint={isTimeInExistingPoint}
      />

      {scoringStarted && (
        <PointsListSection
          expanded={pointsListExpanded}
          onExpandToggle={() => setPointsListExpanded(prev => !prev)}
          chronologicalPoints={chronologicalPoints}
          player1={currentScoreState.player1}
          player2={currentScoreState.player2}
          scrollToIndex={scrollToIndex}
          matchConfig={currentScoreState.matchConfig}
          onScrollComplete={() => setScrollToIndex(undefined)}
          onSeek={handleSeek}
        />
      )}
    </div>
  );
};

export default Scoreboard; 