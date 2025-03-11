import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Scoreboard from '../components/Scoreboard';
import VideoTimeline from '../components/VideoTimeline';
import ClipManager from '../components/ClipManager';
import { Point } from '../types/scoreboard';
import SavedClipsAndExports from '../components/SavedClipsAndExports';

interface Video {
  id: string;
  filename: string;
  name: string;
  path: string;
  createdAt: string;
}

interface PersistedMatchConfig {
  type: 'match' | 'tiebreak' | null;
  tiebreakPoints: 7 | 10;
  noAd: boolean;
  firstServer: 1 | 2 | null;
  isConfigured: boolean;
}

const VideoEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [points, setPoints] = useState<Point[]>([]);
  const [activeTab, setActiveTab] = useState<'score' | 'clips'>('score');
  const [refreshClips, setRefreshClips] = useState(0);
  const [isLoadingPoints, setIsLoadingPoints] = useState(false);
  const [isSavingPoints, setIsSavingPoints] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  
  // Track if points were loaded from the server
  const pointsLoadedRef = useRef(false);
  
  // Track auto-save timeout
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [matchConfig, setMatchConfig] = useState<PersistedMatchConfig>({
    type: 'match',
    tiebreakPoints: 7,
    noAd: false,
    firstServer: null,
    isConfigured: false
  });
  
  const [playerNames, setPlayerNames] = useState<{player1: string, player2: string}>({
    player1: 'Player 1',
    player2: 'Player 2'
  });

  // Memoize matchConfig, playerNames, and points to prevent unnecessary re-renders
  const memoizedMatchConfig = useMemo(() => matchConfig, [matchConfig]);
  const memoizedPlayerNames = useMemo(() => playerNames, [playerNames]);
  const memoizedPoints = useMemo(() => points, [points]);

  // Function to load points and match data for a video
  const loadVideoPoints = useCallback(async (videoId: string) => {
    if (!videoId || pointsLoadedRef.current) return;
    
    setIsLoadingPoints(true);
    try {
      const response = await axios.get(`http://localhost:3000/api/match/videos/${videoId}/match`);
      
      // Load points if available
      if (response.data && response.data.points && Array.isArray(response.data.points)) {
        setPoints(response.data.points);
        setLastSaved(response.data.lastUpdated);
        pointsLoadedRef.current = true;
        console.log(`Loaded ${response.data.points.length} points for video ${videoId}`);
      }
      
      // Load match configuration if available
      if (response.data && response.data.matchConfig) {
        setMatchConfig(response.data.matchConfig);
        console.log('Loaded match configuration from server');
      }
      
      // Load player names if available
      if (response.data && response.data.playerNames) {
        setPlayerNames(response.data.playerNames);
        console.log('Loaded player names from server');
      }
    } catch (err) {
      console.error('Error loading points:', err);
      // Non-critical error, don't show to user
    } finally {
      setIsLoadingPoints(false);
    }
  }, []);

  // Function to save points and match data for a video
  const saveVideoPoints = useCallback(async (videoId: string, pointsToSave: Point[]) => {
    if (!videoId) return;
    
    setIsSavingPoints(true);
    try {
      const response = await axios.post(`http://localhost:3000/api/match/videos/${videoId}/match`, {
        points: pointsToSave,
        matchConfig,
        playerNames
      });
      setLastSaved(response.data.lastUpdated);
      
      if (pointsToSave.length === 0) {
        console.log(`Saved match configuration and player names for video ${videoId}`);
      } else {
        console.log(`Saved ${pointsToSave.length} points, match configuration, and player names for video ${videoId}`);
      }
    } catch (err) {
      console.error('Error saving data:', err);
      // Display error in the UI rather than using toast
    } finally {
      setIsSavingPoints(false);
    }
  }, [matchConfig, playerNames]);

  // Function to reset points and match configuration
  const resetScoringData = useCallback(async () => {
    if (!id) return;
    
    if (!confirm('Are you sure you want to reset the match? This will clear all points, reset the match configuration, and reset player names to default. This action cannot be undone.')) {
      return;
    }
    
    setIsResetting(true);
    try {
      await axios.post(`http://localhost:3000/api/match/videos/${id}/match/reset`);
      
      // Reset local state
      setPoints([]);
      setMatchConfig({
        type: 'match',
        tiebreakPoints: 7,
        noAd: false,
        firstServer: null,
        isConfigured: false
      });
      
      // Reset player names to default
      setPlayerNames({
        player1: 'Player 1',
        player2: 'Player 2'
      });
      
      // Clear the last saved timestamp
      setLastSaved(null);
      
      // Reset the points loaded flag so we can start fresh
      pointsLoadedRef.current = false;
      
      // Force Scoreboard remount after reset
      setRefreshClips(prev => prev + 1);
      
      console.log('Successfully reset match data');
    } catch (err) {
      console.error('Error resetting scoring data:', err);
    } finally {
      setIsResetting(false);
    }
  }, [id]);

  // Enhanced points change handler with auto-save
  const handlePointsChange = useCallback((newPoints: Point[]) => {
    setPoints(prev => {
      // Avoid update if points haven't changed (deep comparison)
      if (JSON.stringify(prev) === JSON.stringify(newPoints)) {
        return prev;
      }
      
      // Schedule auto-save
      if (id) {
        // Clear any existing timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        
        // Set a new timeout
        saveTimeoutRef.current = setTimeout(() => {
          saveVideoPoints(id, newPoints);
        }, 2000);
      }
      
      return newPoints;
    });
  }, [id, saveVideoPoints]);

  // Enhanced match config change handler to save when config changes
  const handleMatchConfigChange = useCallback((config: Partial<PersistedMatchConfig>) => {
    setMatchConfig(prev => {
      const newConfig = { ...prev, ...config };
      // Avoid update if the config hasn't changed
      if (
        prev.type === newConfig.type &&
        prev.tiebreakPoints === newConfig.tiebreakPoints &&
        prev.noAd === newConfig.noAd &&
        prev.firstServer === newConfig.firstServer &&
        prev.isConfigured === newConfig.isConfigured
      ) {
        return prev;
      }
      
      // Config has changed, schedule a save
      if (id) {
        // Clear any existing timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        
        // Set a new timeout
        saveTimeoutRef.current = setTimeout(() => {
          saveVideoPoints(id, points);
        }, 2000);
      }
      
      return newConfig;
    });
  }, [id, points, saveVideoPoints]);

  // Enhanced player names change handler to save when names change
  const handlePlayerNamesChange = useCallback((player1: string, player2: string) => {
    setPlayerNames(prev => {
      if (prev.player1 === player1 && prev.player2 === player2) {
        return prev;
      }
      
      const newNames = { player1, player2 };
      
      // Names have changed, schedule a save
      if (id) {
        // Clear any existing timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        
        // Set a new timeout
        saveTimeoutRef.current = setTimeout(() => {
          saveVideoPoints(id, points);
        }, 2000);
      }
      
      return newNames;
    });
  }, [id, points, saveVideoPoints]);

  // Handler to trigger refresh of saved clips and exports
  const handleClipCreated = () => {
    setRefreshClips(prev => prev + 1);
  };

  // Load the video
  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const response = await axios.get(`http://localhost:3000/api/videos/${id}`);
        setVideo(response.data.video);
      } catch (err) {
        setError('Failed to load video');
        console.error('Error fetching video:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [id]);

  // Load points when the component mounts
  useEffect(() => {
    if (id) {
      loadVideoPoints(id);
    }
  }, [id, loadVideoPoints]);
  
  // Save data when component unmounts if there are pending changes
  useEffect(() => {
    return () => {
      // If there's a pending timeout, clear it and save immediately
      if (saveTimeoutRef.current && id) {
        clearTimeout(saveTimeoutRef.current);
        saveVideoPoints(id, points);
        console.log('Saving data on component unmount');
      }
    };
  }, [id, points, saveVideoPoints]);

  const handleNameChange = async (newName: string) => {
    if (!video) return;
    try {
      const response = await axios.put(`http://localhost:3000/api/videos/${video.id}/rename`, {
        name: newName || 'Untitled Video'
      });
      setVideo(prev => prev ? { ...prev, name: response.data.video.name } : null);
    } catch (err) {
      console.error('Error updating video name:', err);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  // Function to immediately save current state before navigation
  const saveAndNavigate = async () => {
    if (id) {
      // Clear any pending auto-save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      
      // Save immediately
      try {
        await saveVideoPoints(id, points);
        // Navigate after save completes
        navigate('/videos');
      } catch (err) {
        console.error('Error saving before navigation:', err);
        // Navigate anyway even if save fails
        navigate('/videos');
      }
    } else {
      // If no ID, just navigate
      navigate('/videos');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading video...</div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg text-red-600">{error || 'Video not found'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={video.name === 'Untitled Video' ? '' : video.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Untitled Video"
              className="text-2xl font-semibold text-gray-900 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:rounded-md rounded-md placeholder-gray-400 min-w-[200px] px-2 py-1 border border-transparent hover:border-gray-300 transition-colors duration-200"
            />
            <span className="text-sm text-gray-500">
              Uploaded {new Date(video.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {isLoadingPoints && (
              <span className="text-sm text-blue-600">Loading points...</span>
            )}
            {isSavingPoints && (
              <span className="text-sm text-blue-600">Saving points...</span>
            )}
            {isResetting && (
              <span className="text-sm text-blue-600">Resetting scoring data...</span>
            )}
            {!isLoadingPoints && !isSavingPoints && !isResetting && lastSaved && (
              <span className="text-sm text-gray-500">
                Last saved: {new Date(lastSaved).toLocaleDateString(undefined, {
                  year: '2-digit',
                  month: 'numeric',
                  day: 'numeric'
                })} {new Date(lastSaved).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            )}
            <button
              onClick={resetScoringData}
              disabled={isResetting}
              className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md 
                text-red-600 border-red-300 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
                ${isResetting ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              title="Reset match configuration and clear all points"
            >
              Reset Match
            </button>
            <button
              onClick={saveAndNavigate}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back to Videos
            </button>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Video Player Column */}
              <div className="lg:col-span-2">
                <div className="aspect-w-16 aspect-h-9">
                  <video
                    ref={videoRef}
                    controls
                    className="w-full h-full rounded-lg"
                    src={`http://localhost:3000/${video.path}`}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
                <VideoTimeline
                  videoRef={videoRef}
                  points={memoizedPoints}
                  onSeek={handleSeek}
                />
              </div>

              {/* Right Column with Tabs */}
              <div className="lg:col-span-1">
                <div className="mb-4 border-b">
                  <nav className="flex space-x-2 mb-4">
                    <button
                      onClick={() => setActiveTab('score')}
                      className={`px-4 py-2 border text-sm font-medium rounded-md ${
                        activeTab === 'score'
                          ? 'text-indigo-600 bg-white border-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                          : 'text-gray-500 border-gray-300 bg-white hover:bg-gray-50'
                      }`}
                    >
                      Scoring
                    </button>
                    <button
                      onClick={() => setActiveTab('clips')}
                      className={`px-4 py-2 border text-sm font-medium rounded-md ${
                        activeTab === 'clips'
                          ? 'text-indigo-600 bg-white border-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                          : 'text-gray-500 border-gray-300 bg-white hover:bg-gray-50'
                      }`}
                    >
                      Clip Manager
                    </button>
                  </nav>
                </div>

                {/* Ensure consistent height between tabs */}
                <div style={{ minHeight: 'calc(100vh - 600px)' }}>
                  {activeTab === 'score' ? (
                    <div>
                      <Scoreboard 
                        key={`scoreboard-${refreshClips}`}
                        onPlayerNamesChange={handlePlayerNamesChange}
                        videoRef={videoRef}
                        onPointsChange={handlePointsChange}
                        playerNames={memoizedPlayerNames}
                        matchConfig={memoizedMatchConfig}
                        onMatchConfigChange={handleMatchConfigChange}
                        initialPoints={memoizedPoints}
                      />
                    </div>
                  ) : (
                    <div>
                      <ClipManager 
                        videoId={video.id} 
                        points={memoizedPoints}
                        clipsSavedBelow={true}
                        onClipCreated={handleClipCreated}
                        videoName={video.name}
                        player1={points.length > 0 && points[0].scoreState ? 
                          points[0].scoreState.player1 : 
                          {
                            name: playerNames.player1,
                            completedSets: [],
                            currentSet: 0,
                            currentGame: 0,
                            isServing: matchConfig.firstServer === 1
                          }
                        }
                        player2={points.length > 0 && points[0].scoreState ? 
                          points[0].scoreState.player2 : 
                          {
                            name: playerNames.player2,
                            completedSets: [],
                            currentSet: 0,
                            currentGame: 0,
                            isServing: matchConfig.firstServer === 2
                          }
                        }
                        matchConfig={{
                          ...matchConfig,
                          inTiebreak: false
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* New row for Saved Clips and Exports - always visible */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mt-6">
          <div className="p-6">
            <SavedClipsAndExports 
              videoId={video.id} 
              refreshTrigger={refreshClips}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoEdit;