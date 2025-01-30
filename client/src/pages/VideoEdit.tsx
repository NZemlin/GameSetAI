import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Scoreboard from '../components/Scoreboard';
import VideoTimeline from '../components/VideoTimeline';
import { Point } from '../types/scoreboard';

interface Video {
  id: string;
  filename: string;
  name: string;
  path: string;
  createdAt: string;
}

const VideoEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [points, setPoints] = useState<Point[]>([]);

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

  const handlePlayerNamesChange = (player1: string, player2: string) => {
    console.log('Player names updated:', { player1, player2 });
    // Will handle saving player names later
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
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
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
                    points={points}
                    onSeek={handleSeek}
                  />
                </div>

                {/* Scoreboard Column */}
                <div className="lg:col-span-1">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Match Score</h2>
                  <Scoreboard 
                    onPlayerNamesChange={handlePlayerNamesChange}
                    videoRef={videoRef}
                    onPointsChange={setPoints}
                  />
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