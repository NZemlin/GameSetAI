import { useState, useEffect } from 'react';
import axios from 'axios';
import { Point, Player, MatchConfig } from '../types/scoreboard';

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
  videoName?: string;
  player1?: Player;
  player2?: Player;
  matchConfig?: MatchConfig;
  onExportStatusChange?: (isExporting: boolean) => void;
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

const ClipManager = ({ 
  videoId, 
  points, 
  clipsSavedBelow = false, 
  onClipCreated, 
  videoName,
  player1,
  player2,
  matchConfig,
  onExportStatusChange
}: ClipManagerProps) => {
  const [clips, setClips] = useState<ClipMetadata[]>([]);
  const [exports, setExports] = useState<ExportMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<number[]>([]);
  const [includeScoreboard, setIncludeScoreboard] = useState<boolean>(false);
  const [ffmpegInstalled, setFffmpegInstalled] = useState<boolean | null>(null);
  const [exportProgress, setExportProgress] = useState<{active: boolean, total: number, current: number} | null>(null);

  // Get the JWT token from localStorage
  const token = localStorage.getItem('token');

  // Check for any in-progress exports when component mounts
  useEffect(() => {
    const storedExportStatus = localStorage.getItem(`export_status_${videoId}`);
    if (storedExportStatus) {
      try {
        const status = JSON.parse(storedExportStatus);
        if (status.active) {
          setExportLoading(true);
          setExportProgress(status);
        }
      } catch (err) {
        console.error('Error parsing stored export status:', err);
        localStorage.removeItem(`export_status_${videoId}`);
      }
    }
  }, [videoId]);

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

  // Notify the parent component when export status changes
  useEffect(() => {
    if (onExportStatusChange) {
      onExportStatusChange(exportLoading);
    }
  }, [exportLoading, onExportStatusChange]);

  // Function to create a clip
  const createClip = async (startTime: number, endTime: number, label?: string, pointIndex?: number) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Prepare the scoreboard data if scoreboard is to be included
      let scoreData = null;
      if (includeScoreboard && player1 && player2 && matchConfig) {
        // Find the point that corresponds to this time range (if any)
        const matchingPointIndex = points.findIndex(p => 
          p.startTime !== null && 
          p.endTime !== null && 
          Math.abs(p.startTime - startTime) < 0.1 && 
          Math.abs(p.endTime - endTime) < 0.1
        );
        
        // Use the provided pointIndex if available, otherwise use the matching point
        const currentPointIndex = pointIndex !== undefined ? pointIndex : matchingPointIndex;
        
        // If we found a matching point, we'll use the backend's consistent helper function
        // by passing all the points and the current point's index
        if (currentPointIndex !== -1) {
          // We'll let the backend determine the score state
          const response = await axios.post('http://localhost:3000/api/processing/clip', {
            videoId,
            startTime,
            endTime,
            label,
            includeScoreboard,
            matchData: {
              player1,
              player2,
              matchConfig
            },
            pointIndex: currentPointIndex,
            points: points
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
          
          setLoading(false);
          return;
        }
        
        // If we didn't find a matching point, prepare the score data locally
        // Start with default state (0-0)
        scoreData = {
          player1: { 
            ...player1,
            completedSets: [],
            currentSet: 0,
            currentGame: 0,
            isServing: matchConfig.firstServer === 1
          },
          player2: { 
            ...player2,
            completedSets: [],
            currentSet: 0,
            currentGame: 0,
            isServing: matchConfig.firstServer === 2
          },
          matchConfig: { 
            ...matchConfig,
            inTiebreak: matchConfig.type === 'tiebreak' 
          },
          pointTime: startTime
        };
      }
      
      const response = await axios.post('http://localhost:3000/api/processing/clip', {
        videoId,
        startTime,
        endTime,
        label,
        includeScoreboard,
        scoreData
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
  const exportSelectedPoints = async (videoName?: string) => {
    if (selectedPoints.length === 0) {
      setError('Please select at least one point to export');
      return;
    }

    setExportLoading(true);
    setError(null);
    setSuccess(null);
    
    const pointsToExport = selectedPoints.map(index => points[index]).filter(
      point => point.startTime !== null && point.endTime !== null
    );
    
    // Set initial export progress
    const initialProgress = {
      active: true,
      total: pointsToExport.length,
      current: 0
    };
    setExportProgress(initialProgress);
    
    // Store the export status in localStorage
    localStorage.setItem(`export_status_${videoId}`, JSON.stringify(initialProgress));

    try {
      // Prepare match data if scoreboard is to be included
      let matchData = null;
      if (includeScoreboard && player1 && player2 && matchConfig) {
        matchData = {
          player1,
          player2,
          matchConfig
        };
      }

      // Always export as a single combined video
      const response = await axios.post('http://localhost:3000/api/processing/export', {
        videoId,
        points: pointsToExport,
        includeScoreboard,
        videoName,
        matchData
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Extract the exportId from the response
      const exportId = response.data.exportId;
      
      if (!exportId) {
        throw new Error('Export failed - no export ID returned');
      }
      
      // Start polling for progress updates with simplified retry mechanism
      let retryCount = 0;
      const MAX_RETRIES = 3;
      
      // Function to poll for export progress
      const pollExportProgress = async () => {
        try {
          const progressResponse = await axios.get(`http://localhost:3000/api/processing/export-progress/${exportId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const { progress } = progressResponse.data;
          
          if (progress) {
            // Update the progress state
            setExportProgress({
              active: progress.active,
              total: progress.total,
              current: progress.current
            });
            
            // Update localStorage
            localStorage.setItem(`export_status_${videoId}`, JSON.stringify({
              active: progress.active,
              total: progress.total,
              current: progress.current
            }));
            
            // Reset retry counter on successful response
            retryCount = 0;
            
            // If the export is complete, stop polling and update the UI
            if (progress.completed) {
              clearInterval(progressInterval);
              
              // Fetch the final export data
              const exportsResponse = await axios.get('http://localhost:3000/api/processing/exports', {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              const newExport = exportsResponse.data.exports.find(
                (exp: ExportMetadata) => exp.id === exportId
              );
              
              if (newExport) {
                setExports(prevExports => [...prevExports, newExport]);
                setSuccess('Match video exported successfully');
              }
              
              // Clear the export status
              localStorage.removeItem(`export_status_${videoId}`);
              setExportProgress(null);
              setExportLoading(false);
              
              // Notify parent component that an export has been completed
              if (onClipCreated) {
                onClipCreated();
              }

              // Notify parent component about export status change
              if (onExportStatusChange) {
                onExportStatusChange(false);
              }
            }
          } else {
            console.warn('Received empty progress data');
            handlePollingError();
          }
        } catch (err) {
          console.error('Error checking export progress:', err);
          handlePollingError();
        }
      };
      
      // Start the polling interval
      const progressInterval = setInterval(pollExportProgress, 1000); // Poll every second
      
      // Helper function to handle polling errors with retry logic
      function handlePollingError() {
        retryCount++;
        
        // Check if we need to give up due to too many retries
        if (retryCount > MAX_RETRIES) {
          console.warn(`Max retries (${MAX_RETRIES}) reached for progress polling. Stopping.`);
          clearInterval(progressInterval);
          
          // Don't reset the UI yet as the export might still be processing
          // Instead, show a warning to the user
          setError('Lost connection to the export process. The export may still be processing.');
        }
      }
      
      // If FFmpeg is not installed, handle that case
      if (response.data.ffmpegInstalled !== undefined) {
        setFffmpegInstalled(response.data.ffmpegInstalled);
      }
      
      if (response.data.ffmpegInstalled === false) {
        setSuccess('Export metadata created, but FFmpeg is not installed. Only original video will be referenced.');
        clearInterval(progressInterval);
        setExportLoading(false);
      }
      
      // Notify parent component that clips/exports have been created
      if (onClipCreated) {
        onClipCreated();
      }
    } catch (err) {
      console.error('Error exporting points:', err);
      setError('Failed to export points');
      
      // Clear the export status
      localStorage.removeItem(`export_status_${videoId}`);
      setExportProgress(null);
      setExportLoading(false);
    }
  };

  // Add a cleanup function to clear intervals when component unmounts
  useEffect(() => {
    return () => {
      // Clear any localStorage data when unmounting to prevent stale data
      if (videoId) {
        localStorage.removeItem(`export_status_${videoId}`);
      }
    };
  }, [videoId]);

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
              onClick={() => exportSelectedPoints(videoName)}
              disabled={exportLoading || selectedPoints.length === 0}
              className={`${
                exportLoading || selectedPoints.length === 0
                  ? 'bg-indigo-300 cursor-not-allowed text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              } px-5 py-1.5 rounded font-medium text-sm mr-3 flex items-center`}
            >
              {exportLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : 'Export'}
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
          
          {/* Export progress indicator */}
          {exportProgress && exportProgress.active && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Exporting video...</span>
                <span>
                  {exportProgress.current >= exportProgress.total 
                    ? "Finishing export..." 
                    : `${exportProgress.current} of ${exportProgress.total} points processed`}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Scoreboard option row */}
          <div className="flex items-center mb-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="includeScoreboard"
                checked={includeScoreboard}
                onChange={e => setIncludeScoreboard(e.target.checked)}
                className="mr-2"
                disabled={!player1 || !player2 || !matchConfig}
              />
              <label htmlFor="includeScoreboard" className="text-sm text-gray-800">
                Include scoreboard {ffmpegInstalled === false ? '(requires FFmpeg)' : ''}
              </label>
            </div>
            {includeScoreboard && (!player1 || !player2 || !matchConfig) && (
              <p className="text-red-500 text-sm mt-1">
                Player information or match configuration is missing.
                Scoreboard cannot be included.
              </p>
            )}
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
                    onClick={() => {
                      if (point.startTime !== null && point.endTime !== null) {
                        createClip(
                          point.startTime, 
                          point.endTime, 
                          `Point ${index + 1} (Winner: Player ${point.winner})`,
                          index
                        );
                      }
                    }}
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