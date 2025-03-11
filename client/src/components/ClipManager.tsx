import { useState, useEffect } from 'react';
import axios from 'axios';
import { Point } from '../types/scoreboard';

// Helper function to format seconds to MM:SS format
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
};

// Helper function to format duration
const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

interface ClipManagerProps {
  videoId: string;
  points: Point[];
  clipsSavedBelow?: boolean;
  onClipCreated?: () => void;
}

interface ClipMetadata {
  id: string;
  sourceVideoId: string;
  startTime: number;
  endTime: number;
  label: string;
  path: string;
  createdAt: string;
}

interface ExportMetadata {
  id: string;
  sourceVideoId: string;
  points: number;
  includeScoreboard: boolean;
  path: string;
  createdAt: string;
  label?: string;
}

const ClipManager = ({ videoId, points, clipsSavedBelow = false, onClipCreated }: ClipManagerProps) => {
  const [clips, setClips] = useState<ClipMetadata[]>([]);
  const [exports, setExports] = useState<ExportMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<number[]>([]);
  const [includeScoreboard, setIncludeScoreboard] = useState(true);
  const [ffmpegInstalled, setFffmpegInstalled] = useState<boolean | null>(null);

  // Get the JWT token from localStorage
  const token = localStorage.getItem('token');

  // Fetch clips and exports associated with this video
  useEffect(() => {
    const fetchClipsAndExports = async () => {
      try {
        // Fetch clips
        const clipsResponse = await axios.get('http://localhost:3000/api/processing/clips', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const videoClips = clipsResponse.data.clips.filter(
          (clip: ClipMetadata) => clip.sourceVideoId === videoId
        );
        setClips(videoClips);

        // Fetch exports
        try {
          const exportsResponse = await axios.get('http://localhost:3000/api/processing/exports', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const videoExports = exportsResponse.data.exports.filter(
            (exp: ExportMetadata) => exp.sourceVideoId === videoId
          );
          setExports(videoExports);
        } catch (exportErr) {
          console.error('Error fetching exports:', exportErr);
          setError('Failed to fetch exports. Exports may not be up-to-date.');
        }
      } catch (err) {
        console.error('Error fetching clips:', err);
        setError('Failed to fetch clips');
      }
    };

    fetchClipsAndExports();
  }, [videoId, token]);

  // Check if FFmpeg is installed when component mounts
  useEffect(() => {
    const checkFfmpegStatus = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/processing/ffmpeg-status', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFffmpegInstalled(response.data.installed !== undefined ? response.data.installed : response.data.isInstalled);
      } catch (err) {
        console.error('Error checking FFmpeg status:', err);
        setFffmpegInstalled(false);
      }
    };

    checkFfmpegStatus();
  }, [token]);

  // Function to create a clip for a single point
  const createClipForPoint = async (point: Point) => {
    if (point.startTime === null || point.endTime === null) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post('http://localhost:3000/api/processing/clip', {
        videoId,
        startTime: point.startTime,
        endTime: point.endTime,
        label: `Point ${points.indexOf(point) + 1} (Winner: Player ${point.winner})`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setClips(prevClips => [...prevClips, response.data.clip]);
      setSuccess(response.data.message || 'Clip created successfully');
      
      if (response.data.ffmpegInstalled !== undefined) {
        setFffmpegInstalled(response.data.ffmpegInstalled);
      }
      
      if (!response.data.ffmpegInstalled) {
        setSuccess('Clip metadata created, but FFmpeg is not installed. Only original video will be referenced.');
      }
      
      // Notify parent component that a clip has been created
      if (onClipCreated) {
        onClipCreated();
      }
    } catch (err) {
      console.error('Error creating clip:', err);
      setError('Failed to create clip');
    } finally {
      setLoading(false);
    }
  };

  // Function to export selected points
  const exportSelectedPoints = async () => {
    if (selectedPoints.length === 0) {
      setError('Please select at least one point to export');
      return;
    }

    setExportLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const pointsToExport = selectedPoints.map(index => points[index]).filter(
        point => point.startTime !== null && point.endTime !== null
      );

      // Always export as a single combined video
      const response = await axios.post('http://localhost:3000/api/processing/export', {
        videoId,
        points: pointsToExport,
        includeScoreboard
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(response.data.message || 'Match video exported successfully');
      setExports(prevExports => [...prevExports, response.data.export]);
      
      if (response.data.ffmpegInstalled !== undefined) {
        setFffmpegInstalled(response.data.ffmpegInstalled);
      }
      
      if (!response.data.ffmpegInstalled) {
        setSuccess('Export metadata created, but FFmpeg is not installed. Only original video will be referenced.');
      }
      
      // Notify parent component that clips/exports have been created
      if (onClipCreated) {
        onClipCreated();
      }
    } catch (err) {
      console.error('Error exporting points:', err);
      setError('Failed to export points');
    } finally {
      setExportLoading(false);
    }
  };

  // Function to delete a clip
  const deleteClip = async (clipId: string) => {
    try {
      await axios.delete(`http://localhost:3000/api/processing/clips/${clipId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClips(prevClips => prevClips.filter(clip => clip.id !== clipId));
      setSuccess('Clip deleted successfully');
    } catch (err) {
      console.error('Error deleting clip:', err);
      setError('Failed to delete clip');
    }
  };

  // Function to delete an export
  const deleteExport = async (exportId: string) => {
    try {
      await axios.delete(`http://localhost:3000/api/processing/exports/${exportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExports(prevExports => prevExports.filter(exp => exp.id !== exportId));
      setSuccess('Export deleted successfully');
    } catch (err) {
      console.error('Error deleting export:', err);
      setError('Failed to delete export');
    }
  };

  const togglePointSelection = (index: number) => {
    setSelectedPoints(prevSelected => {
      if (prevSelected.includes(index)) {
        return prevSelected.filter(i => i !== index);
      } else {
        return [...prevSelected, index];
      }
    });
  };

  const selectAllPoints = () => {
    setSelectedPoints(points.map((_, index) => index));
  };

  const deselectAllPoints = () => {
    setSelectedPoints([]);
  };

  return (
    <div className={error || success ? 'mb-4' : ''}>
      {error && <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4">{error}</div>}
      {success && <div className="p-3 bg-green-100 text-green-700 rounded-md mb-4">{success}</div>}
      
      {ffmpegInstalled === false && (
        <div className="p-3 bg-yellow-50 text-yellow-800 rounded-md mb-4 text-sm">
          <p>FFmpeg not detected. Clips will reference original video files.</p>
        </div>
      )}

      <div className="space-y-6">
        <div>
          {/* Main controls row with Export and Select All */}
          <div className="flex items-center mb-3">
            <button
              onClick={exportSelectedPoints}
              disabled={exportLoading || selectedPoints.length === 0}
              className={`${
                exportLoading || selectedPoints.length === 0
                  ? 'bg-indigo-300 cursor-not-allowed text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              } px-5 py-1.5 rounded font-medium text-sm mr-3`}
            >
              {exportLoading ? 'Exporting...' : 'Export'}
            </button>
            
            <button
              onClick={selectedPoints.length === points.length ? deselectAllPoints : selectAllPoints}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-1.5 rounded font-medium text-sm mr-3"
            >
              {selectedPoints.length === points.length ? 'Deselect All' : 'Select All'}
            </button>
            
            <span className="text-sm text-gray-600">
              {selectedPoints.length} of {points.length} selected
            </span>
          </div>
          
          {/* Scoreboard option row */}
          <div className="flex items-center mb-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeScoreboard"
                checked={includeScoreboard}
                onChange={() => setIncludeScoreboard(!includeScoreboard)}
                className="mr-2"
              />
              <label htmlFor="includeScoreboard" className="text-sm text-gray-800">
                Include scoreboard {ffmpegInstalled === false ? '(requires FFmpeg)' : '(coming soon)'}
              </label>
            </div>
          </div>

          {/* Adjust height to match the Scoreboard tab's height */}
          <div className="overflow-y-auto border rounded-lg scrollbar-thin scrollbar-thumb-indigo-200 hover:scrollbar-thumb-indigo-300 scrollbar-track-transparent" 
               style={{ 
                 height: 'calc(100vh - 700px)',
                 minHeight: '350px' 
               }}>
            <div className="divide-y divide-gray-200">
              {points.map((point, index) => (
                <div
                  key={index}
                  className={`flex items-center py-1.5 px-2 ${
                    selectedPoints.includes(index) ? 'bg-indigo-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPoints.includes(index)}
                    onChange={() => togglePointSelection(index)}
                    className="mr-2"
                  />  
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800">
                      Point {index + 1} - Winner: Player {point.winner}
                    </div>
                    <div className="text-xs text-gray-500">
                      {point.startTime !== null && point.endTime !== null
                        ? `${formatTime(point.startTime)} - ${formatTime(point.endTime)} (${formatDuration(point.endTime - point.startTime)})`
                        : 'Time not set'}
                    </div>
                  </div>
                  <button
                    onClick={() => createClipForPoint(point)}
                    disabled={loading || point.startTime === null || point.endTime === null}
                    className={`${
                      loading || point.startTime === null || point.endTime === null
                        ? 'bg-gray-300 cursor-not-allowed text-gray-600'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    } text-xs px-2 py-1 rounded ml-2`}
                  >
                    Create Clip
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Only render the saved clips and exports sections if clipsSavedBelow is false */}
        {!clipsSavedBelow && (
          <>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Saved Clips</h3>
              {clips.length === 0 ? (
                <p className="text-gray-500">No clips available for this video.</p>
              ) : (
                <div className="space-y-3">
                  {clips.map((clip) => (
                    <div key={clip.id} className="bg-white p-3 rounded-md shadow">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-800">{clip.label}</p>
                          <p className="text-sm text-gray-500">
                            Created: {new Date(clip.createdAt).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            Duration: {formatDuration(clip.endTime - clip.startTime)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <a 
                            href={`http://localhost:3000/${clip.path}`} 
                            className="bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            View
                          </a>
                          <a 
                            href={`http://localhost:3000/${clip.path}`} 
                            className="bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200"
                            download={`clip-${clip.label.replace(/\s+/g, '-')}.mp4`}
                          >
                            Download
                          </a>
                          <button
                            onClick={() => deleteClip(clip.id)}
                            className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Saved Exports</h3>
              {exports.length === 0 ? (
                <p className="text-gray-500">No exports available for this video.</p>
              ) : (
                <div className="space-y-3">
                  {exports.map((exportItem) => (
                    <div key={exportItem.id} className="bg-white p-3 rounded-md shadow">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-800">
                            Export {exportItem.id} ({exportItem.points} points)
                          </p>
                          <p className="text-sm text-gray-500">
                            Created: {new Date(exportItem.createdAt).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            Scoreboard: {exportItem.includeScoreboard ? 'Included' : 'Not included'}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <a 
                            href={`http://localhost:3000/${exportItem.path}`} 
                            className="bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            View
                          </a>
                          <a 
                            href={`http://localhost:3000/${exportItem.path}`} 
                            className="bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200"
                            download={`export-${exportItem.id}.mp4`}
                          >
                            Download
                          </a>
                          <button
                            onClick={() => deleteExport(exportItem.id)}
                            className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Export the ClipMetadata and ExportMetadata types so they can be used in the SavedClipsAndExports component
export type { ClipMetadata, ExportMetadata };

export default ClipManager;