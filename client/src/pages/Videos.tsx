import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface Video {
  id: string;
  filename: string;
  name: string;
  path: string;
  createdAt: string;
}

const Videos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/videos');
        setVideos(response.data.videos);
      } catch (err) {
        setError('Failed to load videos');
        console.error('Error fetching videos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []);

  const handleRename = async (id: string) => {
    try {
      const response = await axios.put(`http://localhost:3000/api/videos/${id}/rename`, {
        name: newName,
      });
      
      // Update the videos list with the new name
      setVideos(videos.map(video => 
        video.id === id ? { ...video, name: response.data.video.name } : video
      ));
      
      // Reset editing state
      setEditingId(null);
      setNewName('');
    } catch (err) {
      console.error('Error renaming video:', err);
      setError('Failed to rename video');
    }
  };

  const startEditing = (video: Video) => {
    setEditingId(video.id);
    setNewName(video.name);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading videos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">My Videos</h1>
            <Link
              to="/upload"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Upload New Video
            </Link>
          </div>

          {videos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No videos uploaded yet.</p>
              <Link
                to="/upload"
                className="mt-4 inline-flex items-center text-indigo-600 hover:text-indigo-500"
              >
                Upload your first video
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="bg-white overflow-hidden rounded-lg shadow hover:shadow-md transition-shadow duration-200"
                >
                  <Link to={`/edit/${video.id}`}>
                    <div className="aspect-w-16 aspect-h-9 bg-gray-100">
                      <video
                        src={`http://localhost:3000/${video.path}`}
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                    </div>
                  </Link>
                  <div className="p-4">
                    {editingId === video.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="Enter new name"
                        />
                        <button
                          onClick={() => handleRename(video.id)}
                          className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setNewName('');
                          }}
                          className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900 truncate group-hover:text-indigo-600">
                          {video.name}
                        </h3>
                        <button
                          onClick={() => startEditing(video)}
                          className="ml-2 p-1 text-gray-400 hover:text-gray-500"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                      </div>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      {new Date(video.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Videos; 