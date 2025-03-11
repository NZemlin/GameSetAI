import { useState, useEffect } from 'react';
import axios from 'axios';
import { ClipMetadata, ExportMetadata } from './ClipManager';

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

interface SavedClipsAndExportsProps {
  videoId: string;
  refreshTrigger?: number;
}

const SavedClipsAndExports = ({ videoId, refreshTrigger = 0 }: SavedClipsAndExportsProps) => {
  const [clips, setClips] = useState<ClipMetadata[]>([]);
  const [exports, setExports] = useState<ExportMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'clips' | 'exports'>('clips');
  
  // State for durations
  const [exportDurations, setExportDurations] = useState<{[id: string]: number}>({});
  
  // State for renaming
  const [renamingClipId, setRenamingClipId] = useState<string | null>(null);
  const [renamingExportId, setRenamingExportId] = useState<string | null>(null);
  const [newName, setNewName] = useState<string>('');
  
  // State for video preview hover
  const [hoveredClipId, setHoveredClipId] = useState<string | null>(null);
  const [hoveredExportId, setHoveredExportId] = useState<string | null>(null);
  
  // Get the JWT token from localStorage
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchClipsAndExports = async () => {
      setLoading(true);
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
          setError('Failed to fetch exports.');
        }
      } catch (err) {
        console.error('Error fetching clips:', err);
        setError('Failed to fetch clips.');
      } finally {
        setLoading(false);
      }
    };

    fetchClipsAndExports();
  }, [videoId, token, refreshTrigger]);

  const deleteClip = async (clipId: string) => {
    try {
      await axios.delete(`http://localhost:3000/api/processing/clips/${clipId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove the deleted clip from the state
      setClips(prevClips => prevClips.filter(clip => clip.id !== clipId));
    } catch (err) {
      console.error('Error deleting clip:', err);
      setError('Failed to delete clip');
    }
  };

  const deleteExport = async (exportId: string) => {
    try {
      await axios.delete(`http://localhost:3000/api/processing/exports/${exportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove the deleted export from the state
      setExports(prevExports => prevExports.filter(exp => exp.id !== exportId));
    } catch (err) {
      console.error('Error deleting export:', err);
      setError('Failed to delete export');
    }
  };

  // Handle renaming a clip
  const handleRenameClip = async (clipId: string) => {
    if (!newName.trim()) return;
    
    try {
      await axios.put(`http://localhost:3000/api/processing/clips/${clipId}/rename`, 
        { label: newName },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Update the local state with the renamed clip
      setClips(prevClips => 
        prevClips.map(clip => 
          clip.id === clipId ? { ...clip, label: newName } : clip
        )
      );
      
      // Reset renaming state
      setRenamingClipId(null);
      setNewName('');
    } catch (err) {
      console.error('Error renaming clip:', err);
      setError('Failed to rename clip');
    }
  };

  // Handle renaming an export
  const handleRenameExport = async (exportId: string) => {
    if (!newName.trim()) return;
    
    try {
      await axios.put(`http://localhost:3000/api/processing/exports/${exportId}/rename`, 
        { label: newName },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Update the local state with the renamed export
      setExports(prevExports => 
        prevExports.map(exp => 
          exp.id === exportId ? { ...exp, label: newName } : exp
        )
      );
      
      // Reset renaming state
      setRenamingExportId(null);
      setNewName('');
    } catch (err) {
      console.error('Error renaming export:', err);
      setError('Failed to rename export');
    }
  };

  // Function to start renaming a clip
  const startRenamingClip = (clip: ClipMetadata) => {
    setRenamingClipId(clip.id);
    setNewName(clip.label);
  };

  // Function to start renaming an export
  const startRenamingExport = (exportItem: ExportMetadata) => {
    setRenamingExportId(exportItem.id);
    setNewName(exportItem.label || exportItem.id);
  };

  // Function to cancel renaming
  const cancelRenaming = () => {
    setRenamingClipId(null);
    setRenamingExportId(null);
    setNewName('');
  };

  // Function to handle mouse enter for clip preview
  const handleClipMouseEnter = (clipId: string) => {
    if (renamingClipId) return; // Don't play if we're renaming
    setHoveredClipId(clipId);
  };

  // Function to handle mouse leave for clip preview
  const handleClipMouseLeave = () => {
    // Find the video element for the previously hovered clip and stop it
    const clipVideos = document.querySelectorAll('video');
    clipVideos.forEach(video => {
      if (video.getAttribute('data-id') === hoveredClipId) {
        video.pause();
        video.currentTime = 0;
      }
    });
    setHoveredClipId(null);
  };

  // Function to handle mouse enter for export preview
  const handleExportMouseEnter = (exportId: string) => {
    if (renamingExportId) return; // Don't play if we're renaming
    setHoveredExportId(exportId);
  };

  // Function to handle mouse leave for export preview
  const handleExportMouseLeave = () => {
    // Find the video element for the previously hovered export and stop it
    const exportVideos = document.querySelectorAll('video');
    exportVideos.forEach(video => {
      if (video.getAttribute('data-id') === hoveredExportId) {
        video.pause();
        video.currentTime = 0;
      }
    });
    setHoveredExportId(null);
  };

  // Function to load duration for a specific export
  const loadExportDuration = (exportId: string, videoSrc: string) => {
    // Create a temporary video element to get the duration
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    // Add event listener for when metadata is loaded
    video.onloadedmetadata = () => {
      // Update the durations map with the exact duration
      setExportDurations(prev => ({
        ...prev,
        [exportId]: video.duration
      }));
    };
    
    // Set the source and start loading metadata
    video.src = videoSrc;
  };

  // Render loading state
  if (loading) {
    return (
      <div className="py-4 text-center">
        <div className="spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Tabs for switching between clips and exports */}
      <div className="mb-6">
        <div className="border-b">
          <nav className="flex space-x-2 mb-4">
            <button
              onClick={() => setActiveTab('clips')}
              className={`px-4 py-2 border text-sm font-medium rounded-md ${
                activeTab === 'clips'
                  ? 'text-indigo-600 bg-white border-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                  : 'text-gray-500 border-gray-300 bg-white hover:bg-gray-50'
              }`}
            >
              Saved Clips {clips.length > 0 && `(${clips.length})`}
            </button>
            <button
              onClick={() => setActiveTab('exports')}
              className={`px-4 py-2 border text-sm font-medium rounded-md ${
                activeTab === 'exports'
                  ? 'text-indigo-600 bg-white border-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                  : 'text-gray-500 border-gray-300 bg-white hover:bg-gray-50'
              }`}
            >
              Saved Exports {exports.length > 0 && `(${exports.length})`}
            </button>
          </nav>
        </div>
      </div>

      {/* Display error if any */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Clips Tab Content */}
      {activeTab === 'clips' && (
        <div>
          {clips.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No clips available for this video.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clips.map((clip) => (
                <div 
                  key={clip.id} 
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
                  onMouseEnter={() => handleClipMouseEnter(clip.id)}
                  onMouseLeave={handleClipMouseLeave}
                >
                  <div className="p-4">
                    {/* Video container */}
                    <div 
                      className="w-full mb-3 rounded overflow-hidden relative cursor-pointer" 
                      style={{ paddingBottom: '56.25%' }}
                      onClick={() => window.open(`http://localhost:3000/${clip.path}`, '_blank')}
                    >
                      <video 
                        className="absolute inset-0 w-full h-full object-cover"
                        src={`http://localhost:3000/${clip.path}`}
                        preload="metadata"
                        muted
                        loop
                        playsInline
                        data-id={clip.id}
                        ref={el => {
                          if (el && hoveredClipId === clip.id) {
                            el.currentTime = 0;
                            el.play().catch(err => console.log('Autoplay prevented:', err));
                          }
                        }}
                        onPause={e => {
                          if (hoveredClipId !== clip.id) {
                            e.currentTarget.currentTime = 0;
                          }
                        }}
                        onClick={e => {
                          e.stopPropagation(); // Prevent double triggering
                          window.open(`http://localhost:3000/${clip.path}`, '_blank');
                        }}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>

                    {/* Title and action icons */}
                    {renamingClipId === clip.id ? (
                      <div className="mb-3">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="Enter new name"
                          autoFocus
                        />
                        <div className="flex justify-end mt-2 space-x-2">
                          <button
                            onClick={() => handleRenameClip(clip.id)}
                            className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelRenaming}
                            className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-2">
                        <h3 
                          className="font-medium text-lg text-gray-900 truncate cursor-pointer hover:text-indigo-600" 
                          onClick={() => startRenamingClip(clip)}
                          title="Click to rename"
                        >
                          {clip.label}
                        </h3>
                      </div>
                    )}

                    {/* Time info with icons */}
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <div>
                        <span className="mr-2">Duration: {formatDuration(clip.endTime - clip.startTime)}</span>
                        <span>•</span>
                        <span className="ml-2">{formatTime(clip.startTime)} - {formatTime(clip.endTime)}</span>
                      </div>
                      <div className="flex space-x-3">
                        <a 
                          href={`http://localhost:3000/api/processing/download/clip/${clip.id}`} 
                          className="text-green-600 hover:text-green-800" 
                          title="Download clip"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>
                        <a
                          onClick={() => deleteClip(clip.id)}
                          className="text-red-600 hover:text-red-800 cursor-pointer"
                          title="Delete clip"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Exports Tab Content */}
      {activeTab === 'exports' && (
        <div>
          {exports.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No exports available for this video.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exports.map((exportItem) => {
                // Load the duration if we don't have it yet
                if (!exportDurations[exportItem.id]) {
                  loadExportDuration(exportItem.id, `http://localhost:3000/${exportItem.path}`);
                }
                
                return (
                  <div 
                    key={exportItem.id} 
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
                    onMouseEnter={() => handleExportMouseEnter(exportItem.id)}
                    onMouseLeave={handleExportMouseLeave}
                  >
                    {/* Video container */}
                    <div 
                      className="w-full mb-3 rounded overflow-hidden relative cursor-pointer" 
                      style={{ paddingBottom: '56.25%' }}
                      onClick={() => window.open(`http://localhost:3000/${exportItem.path}`, '_blank')}
                    >
                      <video 
                        className="absolute inset-0 w-full h-full object-cover"
                        src={`http://localhost:3000/${exportItem.path}`}
                        preload="metadata"
                        muted
                        loop
                        playsInline
                        data-id={exportItem.id}
                        ref={el => {
                          if (el && hoveredExportId === exportItem.id) {
                            el.currentTime = 0;
                            el.play().catch(err => console.log('Autoplay prevented:', err));
                          }
                          
                          // Use the video element to update duration if needed
                          if (el && !exportDurations[exportItem.id] && el.duration) {
                            setExportDurations(prev => ({
                              ...prev,
                              [exportItem.id]: el.duration
                            }));
                          }
                        }}
                        onPause={e => {
                          if (hoveredExportId !== exportItem.id) {
                            e.currentTarget.currentTime = 0;
                          }
                        }}
                        onClick={e => {
                          e.stopPropagation(); // Prevent double triggering
                          window.open(`http://localhost:3000/${exportItem.path}`, '_blank');
                        }}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>

                    {/* Title and renaming section */}
                    {renamingExportId === exportItem.id ? (
                      <div className="mb-3 p-4">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="Enter new name"
                          autoFocus
                        />
                        <div className="flex justify-end mt-2 space-x-2">
                          <button
                            onClick={() => handleRenameExport(exportItem.id)}
                            className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelRenaming}
                            className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-2 p-4">
                        <h3 
                          className="font-medium text-lg text-gray-900 truncate cursor-pointer hover:text-indigo-600" 
                          onClick={() => startRenamingExport(exportItem)}
                          title="Click to rename"
                        >
                          {exportItem.label || `Export ${exportItem.id.substring(0, 8)}...`}
                        </h3>
                      
                        {/* Export info with icons */}
                        <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
                          <div>
                            <div className="flex items-center">
                              <span>Duration: {formatDuration(exportDurations[exportItem.id] || 0)}</span>
                              <span className="mx-2">•</span>
                              <span>{exportItem.points} point{exportItem.points !== 1 ? 's' : ''}</span>
                            </div>
                            <div>Scoreboard: {exportItem.includeScoreboard ? 'Included' : 'Not included'}</div>
                          </div>
                          <div className="flex space-x-3">
                            <a 
                              href={`http://localhost:3000/api/processing/download/export/${exportItem.id}`} 
                              className="text-green-600 hover:text-green-800" 
                              title="Download export"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </a>
                            <a
                              onClick={() => deleteExport(exportItem.id)}
                              className="text-red-600 hover:text-red-800 cursor-pointer"
                              title="Delete export"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SavedClipsAndExports;