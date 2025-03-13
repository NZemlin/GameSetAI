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
import { useEffect, useState, useMemo, useRef } from 'react';

// Define the persisted config interface to match what's defined in VideoEdit
interface PersistedMatchConfig {
  type: 'match' | 'tiebreak' | null;
  tiebreakPoints: 7 | 10;
  noAd: boolean;
  firstServer: 1 | 2 | null;
  isConfigured: boolean;
}

interface ScoreboardComponentProps {
  onPlayerNamesChange: (player1: string, player2: string) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  onPointsChange?: (points: Point[]) => void;
  playerNames?: {player1: string, player2: string};
  matchConfig?: PersistedMatchConfig;
  onMatchConfigChange?: (config: Partial<PersistedMatchConfig>) => void;
  initialPoints?: Point[];
}

const Scoreboard = ({ 
  onPlayerNamesChange, 
  videoRef, 
  onPointsChange,
  playerNames,
  matchConfig: parentMatchConfig,
  onMatchConfigChange,
  initialPoints
}: ScoreboardComponentProps) => {
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

  // Track whether initialization has occurred
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize state from props if provided
  useEffect(() => {
    if (playerNames) {
      setPlayer1(prev => ({ ...prev, name: playerNames.player1 }));
      setPlayer2(prev => ({ ...prev, name: playerNames.player2 }));
    }
  }, [playerNames, setPlayer1, setPlayer2]);

  // Initialize match configuration from props if provided
  useEffect(() => {
    if (parentMatchConfig?.isConfigured && !isInitialized) {
      // Only update matchConfig if it has changed
      setMatchConfig(prev => {
        const newConfig = {
          ...prev,
          type: parentMatchConfig.type,
          tiebreakPoints: parentMatchConfig.tiebreakPoints,
          noAd: parentMatchConfig.noAd,
          firstServer: parentMatchConfig.firstServer
        };
        // Avoid update if the config is the same
        if (
          prev.type === newConfig.type &&
          prev.tiebreakPoints === newConfig.tiebreakPoints &&
          prev.noAd === newConfig.noAd &&
          prev.firstServer === newConfig.firstServer
        ) {
          return prev;
        }
        return newConfig;
      });

      // Update player serving state only if necessary
      setPlayer1(prev => {
        const shouldServe = parentMatchConfig.firstServer === 1;
        if (prev.isServing === shouldServe) return prev;
        return { ...prev, isServing: shouldServe };
      });

      setPlayer2(prev => {
        const shouldServe = parentMatchConfig.firstServer === 2;
        if (prev.isServing === shouldServe) return prev;
        return { ...prev, isServing: shouldServe };
      });

      // Only set scoringStarted if it's not already true
      setScoringStarted(prev => (prev ? prev : true));

      // Mark initialization as complete
      setIsInitialized(true);
    }
  }, [parentMatchConfig, isInitialized, setMatchConfig, setPlayer1, setPlayer2, setScoringStarted]);

  // Initialize points from props if provided
  useEffect(() => {
    if (initialPoints && initialPoints.length > 0) {
      setChronologicalPoints({
        points: initialPoints,
        currentIndex: initialPoints.length - 1
      });
    }
  }, [initialPoints, setChronologicalPoints]);

  // Sync match config changes back to parent
  useEffect(() => {
    if (onMatchConfigChange && scoringStarted) {
      onMatchConfigChange({
        type: matchConfig.type,
        tiebreakPoints: matchConfig.tiebreakPoints,
        noAd: matchConfig.noAd,
        firstServer: matchConfig.firstServer,
        isConfigured: true
      });
    }
  }, [matchConfig, scoringStarted, onMatchConfigChange]);

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
  const [editingPointIndex, setEditingPointIndex] = useState<number | null>(null);
  const cooldownRef = useRef(false);
  const [showEditButton, setShowEditButton] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPoint, setEditingPoint] = useState<Point | null>(null);

  // Memoize chronologicalPoints.points to prevent unnecessary reference changes
  const points = useMemo(() => chronologicalPoints.points, [chronologicalPoints.points]);

  // Update video time and calculate current point index (with debouncing)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let timeoutId: NodeJS.Timeout;
    const updateTime = () => {
      const currentTime = video.currentTime;
      
      // Debounce the setCurrentVideoTime update
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setCurrentVideoTime(currentTime);
        
        // Find point that contains current time
        const pointIndex = points.findIndex(point => 
          point.startTime !== null &&
          point.endTime !== null &&
          currentTime >= point.startTime &&
          currentTime <= point.endTime
        );

        // If not found in a point's range, find the last point that starts before current time
        const lastPointBeforeTime = [...points]
          .reverse()
          .findIndex((point: Point) => 
            point.startTime !== null && point.startTime <= currentTime
        );
        
        const targetIndex = pointIndex !== -1 ? pointIndex : 
          (lastPointBeforeTime !== -1 ? points.length - 1 - lastPointBeforeTime : -1);

        // Only update scrollToIndex if it has changed
        setScrollToIndex(prev => {
          if (prev !== targetIndex && targetIndex !== -1) {
            return targetIndex;
          }
          return prev;
        });
      }, 100); // Debounce by 100ms
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('seeked', updateTime);
    
    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('seeked', updateTime);
      clearTimeout(timeoutId);
    };
  }, [videoRef, points, setScrollToIndex]);

  // Update editing index and edit button visibility (with debouncing and state checks)
  useEffect(() => {
    if (!videoRef.current || isEditing) return;

    const currentTime = videoRef.current.currentTime;
    
    // Debounce the state updates to prevent infinite loop
    const timeoutId = setTimeout(() => {
      // Find the point that contains the current time
      const pointIndex = points.findIndex(point => 
        point.startTime !== null &&
        point.endTime !== null &&
        currentTime >= point.startTime &&
        currentTime <= point.endTime
      );

      // Update editing state only if necessary
      setEditingPointIndex(prevIndex => {
        const newIndex = pointIndex !== -1 ? pointIndex : null;
        if (prevIndex !== newIndex) {
          return newIndex;
        }
        return prevIndex; // Avoid update if unchanged
      });

      setShowEditButton(prev => {
        const shouldShow = pointIndex !== -1;
        if (prev !== shouldShow) {
          return shouldShow;
        }
        return prev; // Avoid update if unchanged
      });
    }, 100); // Delay updates by 100ms

    // Cleanup the timeout on effect re-run or unmount
    return () => clearTimeout(timeoutId);
  }, [currentVideoTime, points, isEditing, videoRef]);

  // Filter points up to current video time
  const filteredPoints = useMemo(() => {
    return points.filter(point => 
      point.endTime !== null && 
      point.endTime <= currentVideoTime
    );
  }, [points, currentVideoTime]);

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

  // Notify parent component when points change
  useEffect(() => {
    onPointsChange?.(points);
  }, [points, onPointsChange]);

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

    // Set cooldown before recording point
    cooldownRef.current = true;
    setShowEditButton(false);
    
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
    const insertionIndex = points.findIndex(p => p.startTime! > pointData.startTime!);
    const newIndex = insertionIndex === -1 ? points.length : insertionIndex;

    // Insert point and get new points array
    const newPoints: Point[] = [
      ...points.slice(0, newIndex),
      pointData as Point,
      ...points.slice(newIndex)
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

    // Reset cooldown after 3 seconds
    setTimeout(() => {
      cooldownRef.current = false;
    }, 3000);
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

  // Handle point updates
  const updatePoint = (index: number, updatedPoint: Point) => {
    // Keep minimal logging for important operations
    console.log(`[POINT] Updating point ${index}`);
    
    const newPoints = [...points];
    newPoints[index] = updatedPoint;

    // Recalculate scores from the beginning
    const initialMatchConfig = {
      ...matchConfig,
      inTiebreak: false
    };

    const initialState = {
      player1: { 
        ...player1,
        currentGame: 0,
        currentSet: 0,
        completedSets: [],
        isServing: matchConfig.firstServer === 1
      },
      player2: { 
        ...player2,
        currentGame: 0,
        currentSet: 0,
        completedSets: [],
        isServing: matchConfig.firstServer === 2
      },
      matchConfig: initialMatchConfig
    };

    const { player1: newPlayer1, player2: newPlayer2, matchConfig: newMatchConfig, allStates = [] } = 
      calculateScoreState(newPoints, initialState);

    // Update each point's scoreState and divider based on the recalculated states
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

    setPlayer1(newPlayer1);
    setPlayer2(newPlayer2);
    setMatchConfig(newMatchConfig);
    setChronologicalPoints(prev => ({
      ...prev,
      points: updatedPoints
    }));
    setEditingPointIndex(null);
  };

  // Handle point deletion
  const deletePoint = (index: number) => {
    // Keep minimal logging for important operations
    console.log(`[POINT] Deleting point ${index}`);
    
    const newPoints = points.filter((_, i) => i !== index);

    // Recalculate scores from the beginning
    const initialMatchConfig = {
      ...matchConfig,
      inTiebreak: false
    };

    const initialState = {
      player1: { 
        ...player1,
        currentGame: 0,
        currentSet: 0,
        completedSets: [],
        isServing: matchConfig.firstServer === 1
      },
      player2: { 
        ...player2,
        currentGame: 0,
        currentSet: 0,
        completedSets: [],
        isServing: matchConfig.firstServer === 2
      },
      matchConfig: initialMatchConfig
    };

    const { player1: newPlayer1, player2: newPlayer2, matchConfig: newMatchConfig, allStates = [] } = 
      calculateScoreState(newPoints, initialState);

    // Update each point's scoreState and divider based on the recalculated states
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

    setPlayer1(newPlayer1);
    setPlayer2(newPlayer2);
    setMatchConfig(newMatchConfig);
    setChronologicalPoints(prev => ({
      ...prev,
      points: updatedPoints
    }));
    setEditingPointIndex(null);
  };

  // Add video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsVideoPaused(false);
    const handlePause = () => setIsVideoPaused(true);
    const handleTimeUpdate = () => setCurrentVideoTime(video.currentTime);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [videoRef]);

  const handleEditClick = () => {
    if (!videoRef.current || editingPointIndex === null) return;
    
    // Disable editing mode first to ensure clean state
    setIsEditing(false);
    setEditingPoint(null);
    
    // Get the point data
    const pointToEdit = points[editingPointIndex];
    
    // Keep one concise log for the edit action
    console.log(`[EDIT] Starting edit for point ${editingPointIndex}`);
    
    // Use a small timeout to ensure React has time to process the state changes
    // This is a common technique for handling tricky state update sequences
    setTimeout(() => {
      // First set the point data
      setEditingPoint(pointToEdit);
      
      // Then enable editing mode after the point data is set
      // This small delay ensures the correct sequence of updates
      setTimeout(() => {
        setIsEditing(true);
      }, 10);
    }, 10);
  };

  const handleSaveEdit = (index: number, updatedPoint: Point) => {
    // Keep minimal logging for important operations
    console.log(`[EDIT] Finished editing point ${index}`);
    updatePoint(index, updatedPoint);
    setIsEditing(false);
    setEditingPoint(null);
  };

  const handleDeleteClick = () => {
    if (editingPointIndex === null) return;
    // Keep minimal logging for important operations
    console.log(`[EDIT] Deleting point ${editingPointIndex}`);
    deletePoint(editingPointIndex);
    setIsEditing(false);
    setEditingPoint(null);
    setEditingPointIndex(null);
  };

  // Helper to check if time is within existing points
  const isTimeInExistingPoint = (time: number, excludeIndex?: number) => {
    return points.some((point, index) => {
      // Skip if this is the point we're excluding
      if (excludeIndex !== undefined && excludeIndex === index) {
        return false;
      }
      return point.startTime !== null &&
        point.endTime !== null &&
        time >= point.startTime &&
        time <= point.endTime;
    });
  };

  return (
    <div className="flex flex-col h-full relative">
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
        showEditButton={showEditButton}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
        isEditing={isEditing}
        editingPoint={editingPoint}
        onSaveEdit={handleSaveEdit}
        videoRef={videoRef}
        points={points}
        editingPointIndex={editingPointIndex}
      />

      {scoringStarted && (
        <PointsListSection
          expanded={pointsListExpanded}
          onExpandToggle={() => setPointsListExpanded(prev => !prev)}
          chronologicalPoints={chronologicalPoints}
          player1={player1}
          player2={player2}
          scrollToIndex={scrollToIndex}
          setScrollToIndex={setScrollToIndex}
          matchConfig={matchConfig}
          onScrollComplete={() => setScrollToIndex(undefined)}
          onSeek={handleSeek}
          isVideoPaused={isVideoPaused}
          currentVideoTime={currentVideoTime}
        />
      )}
    </div>
  );
};

export default Scoreboard;