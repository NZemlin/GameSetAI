import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Scoreboard from '../components/Scoreboard';
import VideoTimeline from '../components/VideoTimeline';
import ClipManager from '../components/ClipManager';
import { Point } from '../types/scoreboard';

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

  // Memoize callbacks to prevent unnecessary re-renders
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
      return newConfig;
    });
  }, []);

  const handlePointsChange = useCallback((newPoints: Point[]) => {
    setPoints(prev => {
      // Avoid update if points haven't changed (deep comparison)
      if (JSON.stringify(prev) === JSON.stringify(newPoints)) {
        return prev;
      }
      return newPoints;
    });
  }, []);

  const handlePlayerNamesChange = useCallback((player1: string, player2: string) => {
    setPlayerNames(prev => {
      if (prev.player1 === player1 && prev.player2 === player2) {
        return prev;
      }
      return { player1, player2 };
    });
  }, []);

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
    <div className="min-h-screen bg-gray-100 px-4">
      {/* Removed max-w-7xl and adjusted padding */}
      <div className="py-6">
        <div className="px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                value={video.name === 'Untitled Video' ? '' : video.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Untitled Video"
                className="text-2xl font-semibold text-gray-900 bg-transparent focus:outline-none placeholder-gray-400 min-w-[200px]"
              />
              <span className="text-sm text-gray-500">
                Uploaded {new Date(video.createdAt).toLocaleDateString()}
              </span>
            </div>
            <button
              onClick={() => navigate('/videos')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back to Videos
            </button>
          </div>

          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
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
                        Clips & Export
                      </button>
                    </nav>
                  </div>

                  {activeTab === 'score' ? (
                    <div>
                      <Scoreboard 
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
                      <ClipManager videoId={video.id} points={memoizedPoints} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoEdit;