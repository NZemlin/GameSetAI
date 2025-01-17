import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

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
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
            <h1 className="text-2xl font-semibold text-gray-900">{video.name}</h1>
            <button
              onClick={() => navigate('/videos')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back to Videos
            </button>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="aspect-w-16 aspect-h-9">
                <video
                  controls
                  className="w-full h-full rounded-lg"
                  src={`http://localhost:3000/${video.path}`}
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              <div className="mt-6">
                <h2 className="text-lg font-medium text-gray-900">Video Details</h2>
                <dl className="mt-2 border-t border-b border-gray-200 divide-y divide-gray-200">
                  <div className="py-3 flex justify-between text-sm font-medium">
                    <dt className="text-gray-500">Uploaded</dt>
                    <dd className="text-gray-900">{new Date(video.createdAt).toLocaleDateString()}</dd>
                  </div>
                  <div className="py-3 flex justify-between text-sm font-medium">
                    <dt className="text-gray-500">Filename</dt>
                    <dd className="text-gray-900">{video.filename}</dd>
                  </div>
                </dl>
              </div>

              {/* Placeholder for future editing features */}
              <div className="mt-6">
                <h2 className="text-lg font-medium text-gray-900">Editing Tools</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Video editing features will be available in a future update.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoEdit; 