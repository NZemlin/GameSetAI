import { RequestHandler } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { renderClipWithScoreboard } from '../services/scoreboardRenderer';

/**
 * Formats a time in seconds to a human-readable MM:SS format
 */
const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Interface for clip request
interface ClipRequest {
  videoId: string;
  clips: {
    startTime: number;
    endTime: number;
    label?: string;
  }[];
  outputFormat?: 'mp4' | 'webm';
}

// Interface for clip metadata
interface ClipMetadata {
  id: string;
  sourceVideoId: string;
  startTime: number;
  endTime: number;
  label: string;
  path: string;
  createdAt: string;
  isCompilation?: boolean;
  sourceClips?: ClipMetadata[];
  includeScoreboard: boolean;
}

// Interface for export metadata
interface ExportMetadata {
  id: string;
  sourceVideoId: string;
  points: number;
  includeScoreboard: boolean;
  path: string;
  createdAt: string;
  label?: string;
}

// Types for metadata collections
interface MetadataCollection {
  [id: string]: ClipMetadata | ExportMetadata;
}

// Path to the directory where processed videos will be stored
const processedVideosPath = path.join(__dirname, '../../processed');

// Ensure the processed videos directory exists
const ensureProcessedDir = async () => {
  try {
    await fs.access(processedVideosPath);
  } catch {
    await fs.mkdir(processedVideosPath, { recursive: true });
  }
};

// Check if FFmpeg is installed
const checkFfmpegInstalled = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    exec(`"${ffmpegPath}" -version`, (error) => {
      resolve(!error);
    });
  });
};

/**
 * Detects available hardware acceleration options for FFmpeg
 */
const detectHardwareAcceleration = (): Promise<string> => {
  return new Promise((resolve) => {
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    // Check for NVIDIA GPU support (NVENC)
    exec(`"${ffmpegPath}" -encoders | findstr nvenc`, (nvencError, nvencOutput) => {
      if (!nvencError && nvencOutput.includes('nvenc')) {
        // NVIDIA acceleration available
        return resolve('-c:v h264_nvenc -preset p2 -tune hq');
      }
      
      // Check for Intel QuickSync support
      exec(`"${ffmpegPath}" -encoders | findstr qsv`, (qsvError, qsvOutput) => {
        if (!qsvError && qsvOutput.includes('qsv')) {
          // Intel QuickSync available
          return resolve('-c:v h264_qsv -preset:v faster');
        }
        
        // Check for AMD/ATI support (AMF)
        exec(`"${ffmpegPath}" -encoders | findstr amf`, (amfError, amfOutput) => {
          if (!amfError && amfOutput.includes('amf')) {
            // AMD acceleration available
            return resolve('-c:v h264_amf -quality speed');
          }
          
          // No hardware acceleration detected, use standard libx264 with optimized settings
          resolve('-c:v libx264 -preset:v faster -crf 23');
        });
      });
    });
  });
};

// Cache for hardware acceleration options - move outside function to global cache
let hwAccelOptions: string | null = null;

// Function to get hardware acceleration options (cached)
const getHWAccelOptions = async (): Promise<string> => {
  if (hwAccelOptions === null) {
    hwAccelOptions = await detectHardwareAcceleration();
  }
  return hwAccelOptions;
};

// Initialize hardware acceleration detection at startup to avoid first-run delay
const initializeFFmpegOptimizations = () => {
  // Start hardware acceleration detection in the background
  getHWAccelOptions().then(options => {
    console.info(`FFmpeg hardware acceleration detected: ${options}`);
  }).catch(err => {
    console.error('Error detecting hardware acceleration:', err);
  });
};

// Auto-execute the initialization
initializeFFmpegOptimizations();

// Export the FFmpeg check function as a RequestHandler
export const checkFfmpegStatus: RequestHandler = async (req, res) => {
  try {
    const ffmpegInstalled = await checkFfmpegInstalled();
    res.status(200).json({
      ffmpegInstalled,
      ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg'
    });
  } catch (err) {
    console.error('Error checking FFmpeg status:', err);
    res.status(500).json({ error: 'Error checking FFmpeg status' });
  }
};

/**
 * Creates a mock clip for development without FFmpeg
 * This simply creates the metadata without actually processing the video
 */
const createMockClip = async (
  videoId: string, 
  clipId: string, 
  startTime: number, 
  endTime: number, 
  label: string
): Promise<ClipMetadata> => {
  // For mock clips, we'll just reference the original video
  const uploadsDir = path.join(__dirname, '../../uploads');
  const files = await fs.readdir(uploadsDir);
  const videoFile = files.find(filename => filename.startsWith(videoId));
  
  if (!videoFile) {
    throw new Error('Source video not found');
  }
  
  // Create mock output path (will point to original video)
  const outputFilename = `${clipId}.mp4`;
  
  // Store clip metadata that points to the original video
  const clipMetadata: ClipMetadata = {
    id: clipId,
    sourceVideoId: videoId,
    startTime,
    endTime,
    label: label || `Clip from ${startTime.toFixed(2)} to ${endTime.toFixed(2)}`,
    path: `uploads/${videoFile}`, // Points to original video
    createdAt: new Date().toISOString(),
    includeScoreboard: false
  };
  
  return clipMetadata;
};

/**
 * Helper function to get the previous point's score state or initial state
 * Used to make sure scoreboard display logic is consistent across clips and exports
 */
const getPreviousPointScoreState = (
  points: any[], 
  currentIndex: number,
  matchData: any
): any => {
  // If there's a previous point with score state, use that
  if (currentIndex > 0 && points[currentIndex - 1].scoreState) {
    return {
      player1: { ...matchData.player1, ...points[currentIndex - 1].scoreState.player1 },
      player2: { ...matchData.player2, ...points[currentIndex - 1].scoreState.player2 },
      matchConfig: { 
        ...matchData.matchConfig,
        inTiebreak: points[currentIndex - 1].scoreState.inTiebreak 
      },
      pointTime: points[currentIndex].startTime
    };
  } 
  // For first point, use initial state (0-0)
  else {
    return {
      player1: { 
        ...matchData.player1,
        completedSets: [],
        currentSet: 0,
        currentGame: 0,
        isServing: matchData.matchConfig.firstServer === 1
      },
      player2: { 
        ...matchData.player2,
        completedSets: [],
        currentSet: 0,
        currentGame: 0,
        isServing: matchData.matchConfig.firstServer === 2
      },
      matchConfig: { 
        ...matchData.matchConfig,
        inTiebreak: matchData.matchConfig.type === 'tiebreak' 
      },
      pointTime: points[currentIndex].startTime
    };
  }
};

// Add the export progress tracker
interface ExportProgress {
  active: boolean;
  total: number;
  current: number;
  completed: boolean;
}

// In-memory store to track export progress
const exportProgressTracker: Record<string, ExportProgress> = {};

/**
 * Updates the export progress tracker atomically
 */
const updateExportProgress = (exportId: string, progressUpdate: Partial<ExportProgress>) => {
  if (exportProgressTracker[exportId]) {
    exportProgressTracker[exportId] = {
      ...exportProgressTracker[exportId],
      ...progressUpdate
    };
  }
};

/**
 * Creates a clip from a video using the specified start and end times, with an additional 5-second post-roll.
 */
export const createClip: RequestHandler<any, any> = async (req, res) => {
  await ensureProcessedDir();

  try {
    const { videoId, startTime, endTime, label, includeScoreboard = false, scoreData = null, pointIndex, points, matchData } = req.body;

    // Validate required parameters
    if (!videoId || startTime === undefined || endTime === undefined) {
      res.status(400).json({ error: 'Missing required parameters: videoId, startTime, endTime' });
      return;
    }

    // Find the source video
    const uploadsDir = path.join(__dirname, '../../uploads');
    const files = await fs.readdir(uploadsDir);
    const videoFile = files.find(filename => filename.startsWith(videoId));

    if (!videoFile) {
      res.status(404).json({ error: 'Source video not found' });
      return;
    }

    const clipId = uuidv4();
    const isFfmpegInstalled = await checkFfmpegInstalled();
    let clipMetadata: ClipMetadata;
    const postRollDuration = 5; // Define the post-roll duration as 5 seconds

    if (isFfmpegInstalled) {
      const inputPath = path.join(uploadsDir, videoFile);
      const outputFilename = `${clipId}.mp4`;
      const outputPath = path.join(processedVideosPath, outputFilename);

      let clipScoreData = scoreData;

      // Determine the score state before the point if scoreboard is included
      if (includeScoreboard && points && pointIndex !== undefined && matchData) {
        clipScoreData = getPreviousPointScoreState(points, pointIndex, matchData);
      }

      if (includeScoreboard && clipScoreData && points && pointIndex !== undefined && matchData) {
        // Temporary file paths for main clip and post-roll
        const tempMainPath = path.join(processedVideosPath, `temp_main_${clipId}.mp4`);
        const tempPostrollPath = path.join(processedVideosPath, `temp_postroll_${clipId}.mp4`);
        const listFilePath = path.join(processedVideosPath, `temp_list_${clipId}.txt`);

        // Render main clip (startTime to endTime) with score before the point
        await renderClipWithScoreboard(
          inputPath,
          tempMainPath,
          startTime,
          endTime - startTime,
          clipScoreData
        );

        // Construct score data for post-roll (score after the point)
        const postRollScoreData = {
          player1: { ...matchData.player1, ...points[pointIndex].scoreState.player1 },
          player2: { ...matchData.player2, ...points[pointIndex].scoreState.player2 },
          matchConfig: { ...matchData.matchConfig, inTiebreak: points[pointIndex].scoreState.inTiebreak },
          pointTime: endTime
        };

        // Render post-roll clip (endTime to endTime + 5) with score after the point
        await renderClipWithScoreboard(
          inputPath,
          tempPostrollPath,
          endTime,
          postRollDuration,
          postRollScoreData
        );

        // Create a list file for FFmpeg concatenation
        const fileList = `file '${tempMainPath}'\nfile '${tempPostrollPath}'`;
        await fs.writeFile(listFilePath, fileList, 'utf8');

        // Concatenate main clip and post-roll into final output
        await new Promise<void>((resolve, reject) => {
          const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
          const ffmpegCommand = `"${ffmpegPath}" -f concat -safe 0 -i "${listFilePath}" -c copy "${outputPath}"`;
          exec(ffmpegCommand, (error) => {
            if (error) {
              console.error(`FFmpeg concat error: ${error.message}`);
              reject(error);
              return;
            }
            resolve();
          });
        });

        // Clean up temporary files
        await Promise.all([
          fs.unlink(tempMainPath),
          fs.unlink(tempPostrollPath),
          fs.unlink(listFilePath)
        ]);
      } else {
        // No scoreboard: extract a single clip from startTime to endTime + 5
        const totalDuration = endTime - startTime + postRollDuration;
        await new Promise<void>((resolve, reject) => {
          const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
          const ffmpegCommand = `"${ffmpegPath}" -ss ${startTime} -i "${inputPath}" -t ${totalDuration} -c:v libx264 -c:a aac -ar 48000 -b:a 192k "${outputPath}"`;
          exec(ffmpegCommand, (error) => {
            if (error) {
              console.error(`FFmpeg error: ${error.message}`);
              reject(error);
              return;
            }
            resolve();
          });
        });
      }

      // Update metadata to reflect the extended end time
      const actualEndTime = endTime + postRollDuration;
      clipMetadata = {
        id: clipId,
        sourceVideoId: videoId,
        startTime,
        endTime: actualEndTime,
        label: label || `Clip from ${startTime.toFixed(2)} to ${endTime.toFixed(2)} with 5s post-roll`,
        path: `processed/${outputFilename}`,
        createdAt: new Date().toISOString(),
        includeScoreboard
      };
    } else {
      // FFmpeg not installed: create mock clip metadata
      console.warn('FFmpeg not installed. Creating mock clip metadata only.');
      const actualEndTime = endTime + postRollDuration;
      clipMetadata = await createMockClip(
        videoId,
        clipId,
        startTime,
        actualEndTime,
        label || `Clip from ${startTime.toFixed(2)} to ${endTime.toFixed(2)} with 5s post-roll`
      );
    }

    // Save metadata to clips.json
    const clipsMetadataPath = path.join(processedVideosPath, 'clips.json');
    let clipsMetadata: MetadataCollection = {};

    try {
      const data = await fs.readFile(clipsMetadataPath, 'utf8');
      clipsMetadata = JSON.parse(data);
    } catch {
      // File doesn't exist or is invalid: start with an empty object
    }

    clipsMetadata[clipId] = clipMetadata;
    await fs.writeFile(clipsMetadataPath, JSON.stringify(clipsMetadata, null, 2));

    res.status(200).json({
      message: isFfmpegInstalled ? 'Clip created successfully' : 'Mock clip created (FFmpeg not installed)',
      clip: clipMetadata,
      ffmpegInstalled: isFfmpegInstalled
    });
  } catch (error) {
    console.error('Error creating clip:', error);
    res.status(500).json({ error: 'Failed to create clip' });
  }
};

/**
 * Creates multiple clips from a video and optionally combines them
 */
export const createClips: RequestHandler<any, any> = async (req, res) => {
  await ensureProcessedDir();
  
  // Track all temporary files for cleanup
  const tempFiles: string[] = [];
  let listFilePath = '';
  
  try {
    const { videoId, clips, combineClips = false, outputFormat = 'mp4' } = req.body as ClipRequest & { combineClips?: boolean };
    
    if (!videoId || !clips || !Array.isArray(clips) || clips.length === 0) {
      res.status(400).json({ error: 'Missing required parameters: videoId, clips array' });
      return;
    }
    
    // Find the source video
    const uploadsDir = path.join(__dirname, '../../uploads');
    const files = await fs.readdir(uploadsDir);
    const videoFile = files.find(filename => filename.startsWith(videoId));
    
    if (!videoFile) {
      res.status(404).json({ error: 'Source video not found' });
      return;
    }
    
    const inputPath = path.join(uploadsDir, videoFile);
    const outputClips: ClipMetadata[] = [];
    
    // Check if FFmpeg is installed
    const isFfmpegInstalled = await checkFfmpegInstalled();
    
    if (!isFfmpegInstalled) {
      console.warn('FFmpeg not installed. Creating mock clip metadata only.');
      
      // Create mock clips metadata without actual processing
      for (const clip of clips) {
        const clipId = uuidv4();
        const outputFilename = `${clipId}.${outputFormat}`;
        const mockClipMetadata: ClipMetadata = {
          id: clipId,
          sourceVideoId: videoId,
          startTime: clip.startTime,
          endTime: clip.endTime,
          label: clip.label || `Clip from ${formatTime(clip.startTime)} to ${formatTime(clip.endTime)}`,
          path: `uploads/${videoFile}`, // Points to original video
          createdAt: new Date().toISOString(),
          includeScoreboard: false
        };
        
        outputClips.push(mockClipMetadata);
      }
      
      // Create a mock combined clip if requested
      if (combineClips && outputClips.length > 0) {
        const combinedId = uuidv4();
        const combinedFilename = `${combinedId}.${outputFormat}`;
        const combinedMetadata: ClipMetadata = {
          id: combinedId,
          sourceVideoId: videoId,
          startTime: outputClips[0].startTime,
          endTime: outputClips[outputClips.length - 1].endTime,
          isCompilation: true,
          sourceClips: [...outputClips],
          label: 'Combined Clips',
          path: `uploads/${videoFile}`, // Points to original video
          createdAt: new Date().toISOString(),
          includeScoreboard: false
        };
        
        outputClips.push(combinedMetadata);
      }
      
      // Save clip metadata to clips.json
      const clipsMetadataPath = path.join(processedVideosPath, 'clips.json');
      let clipsMetadata: MetadataCollection = {};
      
      try {
        const data = await fs.readFile(clipsMetadataPath, 'utf8');
        clipsMetadata = JSON.parse(data);
      } catch {
        // If file doesn't exist or is invalid, start with an empty object
      }
      
      // Add all clips to metadata
      for (const clip of outputClips) {
        clipsMetadata[clip.id] = clip;
      }
      
      await fs.writeFile(clipsMetadataPath, JSON.stringify(clipsMetadata, null, 2), 'utf8');
      
      res.status(200).json({
        message: 'Mock clips created (FFmpeg not installed)',
        clips: outputClips,
        ffmpegInstalled: false
      });
      return; // Ensure we exit here
    }
    
    // Process each clip with FFmpeg
    for (const [index, clip] of clips.entries()) {
      const { startTime, endTime, label } = clip;
      const clipId = uuidv4();
      const outputFilename = `${clipId}.${outputFormat}`;
      const outputPath = path.join(processedVideosPath, outputFilename);
      
      // For combined output, we'll create temporary files first
      const tempFilename = combineClips ? `temp_${index}_${clipId}.${outputFormat}` : outputFilename;
      const tempPath = path.join(processedVideosPath, tempFilename);
      
      if (combineClips) {
        tempFiles.push(tempPath);
      }
      
      // Use FFmpeg to create the clip
      await new Promise<void>(async (resolve, reject) => {
        const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
        // Get the hardware acceleration options
        const hwOptions = await getHWAccelOptions();
        
        // Update FFmpeg command to use hardware acceleration when available
        const ffmpegCommand = `"${ffmpegPath}" -ss ${startTime} -i "${inputPath}" -t ${endTime - startTime} ${hwOptions} -c:a aac -ar 48000 -b:a 192k "${tempPath}"`;
        
        exec(ffmpegCommand, (error) => {
          if (error) {
            console.error(`FFmpeg error: ${error.message}`);
            reject(error);
            return;
          }
          resolve();
        });
      });
      
      const clipMetadata: ClipMetadata = {
        id: clipId,
        sourceVideoId: videoId,
        startTime,
        endTime,
        label: label || `Clip from ${formatTime(startTime)} to ${formatTime(endTime)}`,
        path: combineClips ? `temp/${tempFilename}` : `processed/${outputFilename}`,
        createdAt: new Date().toISOString(),
        includeScoreboard: false
      };
      
      outputClips.push(clipMetadata);
    }
    
    // Combine clips if requested
    if (combineClips && tempFiles.length > 0) {
      const combinedId = uuidv4();
      const combinedFilename = `${combinedId}.${outputFormat}`;
      const combinedPath = path.join(processedVideosPath, combinedFilename);
      
      // Create a list file for FFmpeg's concat demuxer
      listFilePath = path.join(processedVideosPath, `temp_list_${combinedId}.txt`);
      const fileList = tempFiles.map(file => `file '${file}'`).join('\n');
      await fs.writeFile(listFilePath, fileList, 'utf8');
      
      // Combine clips with hardware acceleration
      await new Promise<void>(async (resolve, reject) => {
        const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
        // Get hardware acceleration options
        const hwOptions = await getHWAccelOptions();
        
        const ffmpegCommand = `"${ffmpegPath}" -f concat -safe 0 -i "${listFilePath}" ${hwOptions} -c:a aac -ar 48000 -b:a 192k "${combinedPath}"`;
        
        exec(ffmpegCommand, (error) => {
          if (error) {
            console.error(`FFmpeg error: ${error.message}`);
            reject(error);
            return;
          }
          resolve();
        });
      });
      
      // Clean up temp files
      for (const tempFile of tempFiles) {
        try {
          await fs.unlink(tempFile);
        } catch (err) {
          console.error(`Failed to delete temp file ${tempFile}:`, err);
        }
      }
      
      // Clean up the list file
      try {
        await fs.unlink(listFilePath);
      } catch (err) {
        console.error(`Failed to delete list file ${listFilePath}:`, err);
      }
      
      // Add combined clip to output
      const combinedMetadata: ClipMetadata = {
        id: combinedId,
        sourceVideoId: videoId,
        startTime: outputClips[0].startTime,
        endTime: outputClips[outputClips.length - 1].endTime,
        isCompilation: true,
        sourceClips: [...outputClips],
        label: 'Combined Clips',
        path: `processed/${combinedFilename}`,
        createdAt: new Date().toISOString(),
        includeScoreboard: false
      };
      
      outputClips.push(combinedMetadata);
    }
    
    // Save metadata to clips.json
    const clipsMetadataPath = path.join(processedVideosPath, 'clips.json');
    let clipsMetadata: MetadataCollection = {};
    
    try {
      const data = await fs.readFile(clipsMetadataPath, 'utf8');
      clipsMetadata = JSON.parse(data);
    } catch {
      // If file doesn't exist or is invalid, start with an empty object
    }
    
    for (const clip of outputClips) {
      clipsMetadata[clip.id] = clip;
    }
    
    await fs.writeFile(clipsMetadataPath, JSON.stringify(clipsMetadata, null, 2), 'utf8');
    
    res.status(200).json({
      message: 'Clips created successfully',
      clips: outputClips
    });
  } catch (error) {
    console.error('Error creating clips:', error);
    
    // Clean up all temporary files if an error occurs
    for (const tempFile of tempFiles) {
      try {
        await fs.unlink(tempFile);
      } catch (err) {
        console.error(`Failed to delete temp file ${tempFile}:`, err);
      }
    }
    
    // Delete the list file if it exists
    if (listFilePath) {
      try {
        await fs.unlink(listFilePath);
      } catch (err) {
        console.error(`Failed to delete list file ${listFilePath}:`, err);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to create clips', 
      message: error instanceof Error ? error.message : String(error),
      details: 'All temporary files have been cleaned up.'
    });
  }
};

/**
 * Lists all clips
 */
export const listClips: RequestHandler<any, any> = async (req, res) => {
  try {
    const clipsMetadataPath = path.join(processedVideosPath, 'clips.json');
    let clipsMetadata: MetadataCollection = {};
    
    try {
      const data = await fs.readFile(clipsMetadataPath, 'utf8');
      clipsMetadata = JSON.parse(data);
    } catch {
      // If file doesn't exist or is invalid, return an empty array
      res.status(200).json({ clips: [] });
      return;
    }
    
    const clips = Object.values(clipsMetadata);
    
    // Sort by creation date, newest first
    clips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.status(200).json({ clips });
  } catch (error) {
    console.error('Error listing clips:', error);
    res.status(500).json({ error: 'Failed to list clips' });
  }
};

/**
 * Gets a specific clip by ID
 */
export const getClip: RequestHandler<any, any> = async (req, res) => {
  try {
    const { id } = req.params;
    const clipsMetadataPath = path.join(processedVideosPath, 'clips.json');
    
    let clipsMetadata: MetadataCollection = {};
    try {
      const data = await fs.readFile(clipsMetadataPath, 'utf8');
      clipsMetadata = JSON.parse(data);
    } catch {
      res.status(404).json({ error: 'Clip not found' });
      return;
    }
    
    const clip = clipsMetadata[id];
    if (!clip) {
      res.status(404).json({ error: 'Clip not found' });
      return;
    }
    
    res.status(200).json({ clip });
  } catch (error) {
    console.error('Error getting clip:', error);
    res.status(500).json({ error: 'Failed to get clip' });
  }
};

/**
 * Deletes a clip
 */
export const deleteClip: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get clips metadata
    const clipsMetadataPath = path.join(processedVideosPath, 'clips.json');
    let clipsMetadata: MetadataCollection = {};
    
    try {
      const data = await fs.readFile(clipsMetadataPath, 'utf8');
      clipsMetadata = JSON.parse(data);
    } catch {
      // If file doesn't exist or is invalid, return an empty object
    }
    
    if (!clipsMetadata[id]) {
      res.status(404).json({ error: 'Clip not found' });
      return;
    }
    
    const clip = clipsMetadata[id] as ClipMetadata;
    
    // Check if the clip references an original video file
    const isOriginalVideo = clip.path.startsWith('uploads/');
    
    // Only physically delete the file if it's a processed clip (not an original video)
    if (!isOriginalVideo) {
      try {
        await fs.unlink(path.join(__dirname, `../../${clip.path}`));
      } catch (fileErr) {
        console.error('Error deleting file (continuing with metadata deletion):', fileErr);
        // Continue with deleting metadata even if file deletion fails
      }
    }
    
    // Remove from metadata
    delete clipsMetadata[id];
    
    // Save updated metadata
    await fs.writeFile(clipsMetadataPath, JSON.stringify(clipsMetadata, null, 2));
    
    res.json({ 
      message: 'Clip deleted successfully',
      wasOriginalVideo: isOriginalVideo
    });
  } catch (err) {
    console.error('Error deleting clip:', err);
    res.status(500).json({ error: 'Failed to delete clip' });
  }
};

const getVideoDuration = async (videoPath: string): Promise<number> => {
  const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
  return new Promise((resolve, reject) => {
    const command = `"${ffmpegPath}" -i "${videoPath}" 2>&1 | grep "Duration"`;
    exec(command, (error, stdout) => {
      if (error) {
        console.error('Error getting video duration:', error);
        reject(error);
        return;
      }
      const match = stdout.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.\d+/);
      if (match) {
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const seconds = parseInt(match[3], 10);
        resolve(hours * 3600 + minutes * 60 + seconds);
      } else {
        reject(new Error('Could not parse video duration'));
      }
    });
  });
};

/**
 * Exports a match video with selected points and optional scoreboard
 */
export const exportMatchVideo: RequestHandler = async (req, res) => {
  await ensureProcessedDir();
  
  // Track all temporary files for cleanup
  const tempFiles: string[] = [];
  let listFilePath = '';
  
  try {
    const { videoId, points, includeScoreboard = false, videoName = '', matchData = null } = req.body;
    
    if (!videoId || !points || !Array.isArray(points) || points.length === 0) {
      res.status(400).json({ error: 'Invalid request parameters' });
      return;
    }
    
    // Find the source video
    const uploadsDir = path.join(__dirname, '../../uploads');
    const files = await fs.readdir(uploadsDir);
    const videoFile = files.find(filename => filename.startsWith(videoId));
    
    if (!videoFile) {
      res.status(404).json({ error: 'Source video not found' });
      return;
    }
    
    // Get video title from metadata if available, otherwise use default
    let videoTitle = videoName;
    if (!videoTitle) {
      // Try to get video name from metadata
      const metadataPath = path.join(__dirname, '../../uploads', 'metadata.json');
      try {
        const rawData = await fs.readFile(metadataPath, 'utf8');
        const metadata = JSON.parse(rawData);
        videoTitle = metadata[videoId]?.name || '';
      } catch (err) {
        console.error('Error reading metadata.json:', err);
      }
    }
    
    // Format current date for default label
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit'
    });
    
    const defaultLabel = videoTitle 
      ? `${videoTitle} - Highlights (${dateStr})` 
      : `Match Highlights - ${dateStr}`;
    
    const inputPath = path.join(uploadsDir, videoFile);
    const exportId = uuidv4();
    const outputFilename = `export_${exportId}.mp4`;
    const outputPath = path.join(processedVideosPath, outputFilename);
    
    // Initialize progress tracker
    exportProgressTracker[exportId] = {
      active: true,
      total: points.length,
      current: 0,
      completed: false
    };
    
    // Check if FFmpeg is installed
    const isFfmpegInstalled = await checkFfmpegInstalled();
    
    if (!isFfmpegInstalled) {
      console.warn('FFmpeg not installed. Creating mock export metadata only.');
      
      // Create mock export metadata without actual processing
      const exportMetadata: ExportMetadata = {
        id: exportId,
        sourceVideoId: videoId,
        points: points.length,
        includeScoreboard,
        path: `uploads/${videoFile}`, // Points to original video
        createdAt: new Date().toISOString(),
        label: defaultLabel
      };
      
      // Save to exports.json
      const exportsMetadataPath = path.join(processedVideosPath, 'exports.json');
      let exportsMetadata: MetadataCollection = {};
      
      try {
        const data = await fs.readFile(exportsMetadataPath, 'utf8');
        exportsMetadata = JSON.parse(data);
      } catch {
        // If file doesn't exist or is invalid, start with an empty object
      }
      
      exportsMetadata[exportId] = exportMetadata;
      await fs.writeFile(exportsMetadataPath, JSON.stringify(exportsMetadata, null, 2), 'utf8');
      
      // Mark as completed
      exportProgressTracker[exportId] = {
        ...exportProgressTracker[exportId],
        active: false,
        completed: true,
        current: points.length
      };
      
      res.status(200).json({
        message: 'Export metadata created (FFmpeg not installed)',
        export: exportMetadata,
        exportId,
        ffmpegInstalled: false
      });
      return;
    }
    
    // Filter valid points with startTime and endTime
    const validPoints = points.filter(point => 
      typeof point.startTime === 'number' && 
      typeof point.endTime === 'number' &&
      point.endTime > point.startTime
    );
    
    if (validPoints.length === 0) {
      res.status(400).json({ error: 'No valid points with timestamps provided' });
      return;
    }
    
    // Update the total in the progress tracker
    exportProgressTracker[exportId].total = validPoints.length;
    
    // Send back the initial response so the client can start checking progress
    res.status(200).json({
      message: 'Export started',
      exportId,
      ffmpegInstalled: true
    });
    
    // Create list file path for FFmpeg
    listFilePath = path.join(processedVideosPath, `temp_list_${exportId}.txt`);
    
    // Create individual clip for each point - PARALLEL PROCESSING
    const clipProcessingPromises = validPoints.map(async (point, index) => {
      const tempFilename = `temp_point_${index}_${exportId}.mp4`;
      const tempPath = path.join(processedVideosPath, tempFilename);
      tempFiles.push(tempPath);
      
      if (includeScoreboard && matchData && point.scoreState) {
        // Use the consistent helper function to get the previous point's score state
        const pointScoreData = getPreviousPointScoreState(validPoints, index, matchData);
        
        await renderClipWithScoreboard(
          inputPath,
          tempPath,
          point.startTime,
          point.endTime - point.startTime,
          pointScoreData
        );
      } else {
        // Extract the clip for this point without scoreboard
        await new Promise<void>(async (resolve, reject) => {
          const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
          // Get the hardware acceleration options
          const hwOptions = await getHWAccelOptions();
          
          // Update FFmpeg command with optimized fast keyframe-based seeking and movflags
          const fastSeekTime = Math.max(0, point.startTime - 1); // Start seeking 1 second before for keyframe alignment
          const duration = (point.endTime - point.startTime) + 0.5; // Add a small buffer for precise cutting
          
          const ffmpegCommand = `"${ffmpegPath}" -ss ${fastSeekTime} -i "${inputPath}" -ss 1 -t ${duration} ${hwOptions} -c:a aac -ar 48000 -b:a 192k -movflags +faststart "${tempPath}"`;
          
          exec(ffmpegCommand, (error) => {
            if (error) {
              console.error(`FFmpeg error: ${error.message}`);
              reject(error);
              return;
            }
            resolve();
          });
        });
      }
      
      // Update progress after each point is processed - using atomic update
      updateExportProgress(exportId, { current: exportProgressTracker[exportId].current + 1 });
      return tempPath;
    });
    
    // Process all clips in parallel with a concurrency limit and prioritize the first clip
    const CONCURRENCY_LIMIT = 3; // Process up to 3 clips at once
    
    // Start processing the first clip immediately to reduce perceived delay
    if (clipProcessingPromises.length > 0) {
      // Update progress tracker to show we're starting
      updateExportProgress(exportId, { current: 1 });
      
      // Start processing batches, starting from the second clip (index 1)
      const processBatch = async (batch: number, startFromIdx: number = 0) => {
        const startIdx = startFromIdx + (batch * CONCURRENCY_LIMIT);
        const endIdx = Math.min(startIdx + CONCURRENCY_LIMIT, clipProcessingPromises.length);
        if (startIdx >= clipProcessingPromises.length) return;
        
        await Promise.all(clipProcessingPromises.slice(startIdx, endIdx));
        
        // Process next batch
        await processBatch(batch + 1, startFromIdx);
      };
      
      // Start processing first clip immediately
      await clipProcessingPromises[0];
      
      // Then process the rest in batches
      if (clipProcessingPromises.length > 1) {
        await processBatch(0, 1); // Start batches from the second clip (index 1)
      }
    }
    
    // Add a post-roll segment showing the final score after the last point
    if (includeScoreboard && matchData && validPoints.length > 0) {
      const lastPoint = validPoints[validPoints.length - 1];
      if (lastPoint.scoreState && lastPoint.winner) {
        const postRollFilename = `temp_postroll_${exportId}.mp4`;
        const postRollPath = path.join(processedVideosPath, postRollFilename);
        
        // For the post-roll score, we need the score AFTER the last point was played
        // If we have more than one point, we can get it from the next point
        let finalScoreData;
        
        if (validPoints.length > 1) {
          const lastPointIndex = validPoints.indexOf(lastPoint);
          const nextPointIndex = (lastPointIndex < validPoints.length - 1) ? lastPointIndex + 1 : -1;
          
          if (nextPointIndex >= 0 && validPoints[nextPointIndex].scoreState) {
            // Use the score state from the next point
            finalScoreData = {
              player1: JSON.parse(JSON.stringify({ ...matchData.player1, ...validPoints[nextPointIndex].scoreState.player1 })),
              player2: JSON.parse(JSON.stringify({ ...matchData.player2, ...validPoints[nextPointIndex].scoreState.player2 })),
              matchConfig: { ...matchData.matchConfig, inTiebreak: validPoints[nextPointIndex].scoreState.inTiebreak },
              pointTime: lastPoint.endTime
            };
          } else {
            // Use the last point's score state directly, as it already includes the result of that point
            finalScoreData = {
              player1: JSON.parse(JSON.stringify({ ...matchData.player1, ...lastPoint.scoreState.player1 })),
              player2: JSON.parse(JSON.stringify({ ...matchData.player2, ...lastPoint.scoreState.player2 })),
              matchConfig: { ...matchData.matchConfig, inTiebreak: lastPoint.scoreState.inTiebreak },
              pointTime: lastPoint.endTime
            };
          }
        } else {
          // For a single point, use its scoreState directly (already includes the winner's point)
          finalScoreData = {
            player1: JSON.parse(JSON.stringify({ ...matchData.player1, ...lastPoint.scoreState.player1 })),
            player2: JSON.parse(JSON.stringify({ ...matchData.player2, ...lastPoint.scoreState.player2 })),
            matchConfig: { ...matchData.matchConfig, inTiebreak: lastPoint.scoreState.inTiebreak },
            pointTime: lastPoint.endTime
          };
        }
        
        // Simply take 5 seconds of video after the last point ends
        const postRollDuration = 5; // 5 seconds post-roll
        
        // Extract 5 seconds of video after the last point with optimized seeking
        await new Promise<void>(async (resolve, reject) => {
          const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
          // Get hardware acceleration options
          const hwOptions = await getHWAccelOptions();
          
          // Optimize with fast seeking for post-roll
          const fastSeekTime = Math.max(0, lastPoint.endTime - 0.5); // Seek to 0.5 seconds before end point
          
          const ffmpegCommand = `"${ffmpegPath}" -ss ${fastSeekTime} -i "${inputPath}" -ss 0.5 -t ${postRollDuration} ${hwOptions} -c:a aac -ar 48000 -b:a 192k -movflags +faststart "${postRollPath}"`;
          
          exec(ffmpegCommand, (error) => {
            if (error) {
              console.error(`FFmpeg post-roll extraction error: ${error.message}`);
              reject(error);
              return;
            }
            resolve();
          });
        });
        
        // Add the final scoreboard to the post-roll segment
        const postRollWithScoreboardPath = path.join(processedVideosPath, `temp_postroll_scoreboard_${exportId}.mp4`);
        await renderClipWithScoreboard(
          postRollPath,
          postRollWithScoreboardPath,
          0, // From the start of the post-roll
          postRollDuration,
          finalScoreData
        );
        
        // Add the post-roll to the list of clips
        tempFiles.push(postRollWithScoreboardPath);
        
        // Clean up the intermediate file
        await fs.unlink(postRollPath).catch(err => {
          console.error(`Failed to delete intermediate post-roll file: ${err}`);
        });
      }
    }
    
    // Create a text file listing all temp files for FFmpeg input
    const fileList = tempFiles.map(file => `file '${file}'`).join('\n');
    await fs.writeFile(listFilePath, fileList, 'utf8');
    
    // Combine clips with hardware acceleration and fast start optimization
    await new Promise<void>(async (resolve, reject) => {
      const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
      // Get hardware acceleration options
      const hwOptions = await getHWAccelOptions();
      
      // Add movflags for faster start and avoid audio processing if possible
      const ffmpegCommand = `"${ffmpegPath}" -f concat -safe 0 -i "${listFilePath}" ${hwOptions} -c:a aac -ar 48000 -b:a 192k -movflags +faststart "${outputPath}"`;
      
      exec(ffmpegCommand, (error) => {
        if (error) {
          console.error(`FFmpeg error: ${error.message}`);
          reject(error);
          return;
        }
        resolve();
      });
    });
    
    // Clean up temporary files
    for (const tempFile of tempFiles) {
      try {
        await fs.unlink(tempFile);
      } catch (err) {
        console.error(`Failed to delete temp file ${tempFile}:`, err);
      }
    }
    
    // Delete the list file if it exists
    if (listFilePath) {
      try {
        await fs.unlink(listFilePath);
      } catch (err) {
        console.error(`Failed to delete list file ${listFilePath}:`, err);
      }
    }

    // Store export metadata
    const exportMetadata: ExportMetadata = {
      id: exportId,
      sourceVideoId: videoId,
      points: validPoints.length,
      includeScoreboard,
      path: `processed/${outputFilename}`,
      createdAt: new Date().toISOString(),
      label: defaultLabel
    };
    
    // Save metadata to exports.json
    const exportsMetadataPath = path.join(processedVideosPath, 'exports.json');
    let exportsMetadata: MetadataCollection = {};
    
    try {
      const data = await fs.readFile(exportsMetadataPath, 'utf8');
      exportsMetadata = JSON.parse(data);
    } catch {
      // If file doesn't exist or is invalid, start with an empty object
    }
    
    exportsMetadata[exportId] = exportMetadata;
    await fs.writeFile(exportsMetadataPath, JSON.stringify(exportsMetadata, null, 2));
    
    // Mark export as completed
    exportProgressTracker[exportId] = {
      ...exportProgressTracker[exportId],
      active: false,
      completed: true
    };
    
  } catch (error) {
    console.error('Error in exportMatchVideo:', error);
    
    // Update the progress tracker to show the error if we have an exportId
    if (req.body && req.body.exportId) {
      const { exportId } = req.body;
      if (exportProgressTracker[exportId]) {
        exportProgressTracker[exportId].active = false;
        exportProgressTracker[exportId].completed = true;
      }
    }
    
    // Clean up all temporary files if an error occurs
  }
};

/**
 * Lists all exports
 */
export const listExports: RequestHandler<any, any> = async (req, res) => {
  try {
    const exportsMetadataPath = path.join(processedVideosPath, 'exports.json');
    let exportsMetadata: MetadataCollection = {};
    
    try {
      const data = await fs.readFile(exportsMetadataPath, 'utf8');
      exportsMetadata = JSON.parse(data);
    } catch {
      // If file doesn't exist or is invalid, return an empty array
      res.status(200).json({ exports: [] });
      return;
    }
    
    const exports = Object.values(exportsMetadata);
    
    // Sort by creation date, newest first
    exports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.status(200).json({ exports });
  } catch (error) {
    console.error('Error listing exports:', error);
    res.status(500).json({ error: 'Failed to list exports' });
  }
};

/**
 * Deletes an export
 */
export const deleteExport: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get exports metadata
    const exportsMetadataPath = path.join(processedVideosPath, 'exports.json');
    let exportsMetadata: MetadataCollection = {};
    
    try {
      const data = await fs.readFile(exportsMetadataPath, 'utf8');
      exportsMetadata = JSON.parse(data);
    } catch {
      // If file doesn't exist or is invalid, return an empty object
    }
    
    if (!exportsMetadata[id]) {
      res.status(404).json({ error: 'Export not found' });
      return;
    }
    
    const exportItem = exportsMetadata[id] as ExportMetadata;
    
    // Check if the export references an original video file
    const isOriginalVideo = exportItem.path.startsWith('uploads/');
    
    // Only physically delete the file if it's a processed export (not an original video)
    if (!isOriginalVideo) {
      try {
        await fs.unlink(path.join(__dirname, `../../${exportItem.path}`));
      } catch (fileErr) {
        console.error('Error deleting file (continuing with metadata deletion):', fileErr);
        // Continue with deleting metadata even if file deletion fails
      }
    }
    
    // Remove from metadata
    delete exportsMetadata[id];
    
    // Save updated metadata
    await fs.writeFile(exportsMetadataPath, JSON.stringify(exportsMetadata, null, 2));
    
    res.json({ 
      message: 'Export deleted successfully',
      wasOriginalVideo: isOriginalVideo
    });
  } catch (err) {
    console.error('Error deleting export:', err);
    res.status(500).json({ error: 'Failed to delete export' });
  }
};

/**
 * Rename a clip
 * PUT /api/processing/clips/:id/rename
 */
export const renameClip: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { label } = req.body;

  if (!label || !label.trim()) {
    res.status(400).json({ error: 'Label cannot be empty' });
    return;
  }

  try {
    await ensureProcessedDir();
    const clipsMetadataPath = path.join(processedVideosPath, 'clips.json');
    
    let clipsMetadata: { [id: string]: ClipMetadata } = {};
    
    try {
      const data = await fs.readFile(clipsMetadataPath, 'utf8');
      clipsMetadata = JSON.parse(data);
    } catch (error) {
      // If the file doesn't exist or has invalid JSON, start with an empty object
      clipsMetadata = {};
    }
    
    // Check if the clip exists
    if (!clipsMetadata[id]) {
      res.status(404).json({ error: 'Clip not found' });
      return;
    }
    
    // Update the clip's label
    clipsMetadata[id].label = label;
    
    // Save the updated metadata
    await fs.writeFile(clipsMetadataPath, JSON.stringify(clipsMetadata, null, 2));
    
    res.status(200).json({ 
      success: true, 
      message: 'Clip renamed successfully',
      clip: clipsMetadata[id]
    });
  } catch (error) {
    console.error('Error renaming clip:', error);
    res.status(500).json({ error: 'Failed to rename clip' });
  }
};

/**
 * Rename an export
 * PUT /api/processing/exports/:id/rename
 */
export const renameExport: RequestHandler = async (req, res) => {
  const { id } = req.params;
  const { label } = req.body;

  if (!label || !label.trim()) {
    res.status(400).json({ error: 'Label cannot be empty' });
    return;
  }

  try {
    await ensureProcessedDir();
    const exportsMetadataPath = path.join(processedVideosPath, 'exports.json');
    
    let exportsMetadata: { [id: string]: ExportMetadata } = {};
    
    try {
      const data = await fs.readFile(exportsMetadataPath, 'utf8');
      exportsMetadata = JSON.parse(data);
    } catch (error) {
      // If the file doesn't exist or has invalid JSON, start with an empty object
      exportsMetadata = {};
    }
    
    // Check if the export exists
    if (!exportsMetadata[id]) {
      res.status(404).json({ error: 'Export not found' });
      return;
    }
    
    // Update the export's label (ensure ExportMetadata interface has a label property)
    exportsMetadata[id].label = label;
    
    // Save the updated metadata
    await fs.writeFile(exportsMetadataPath, JSON.stringify(exportsMetadata, null, 2));
    
    res.status(200).json({ 
      success: true, 
      message: 'Export renamed successfully',
      export: exportsMetadata[id]
    });
  } catch (error) {
    console.error('Error renaming export:', error);
    res.status(500).json({ error: 'Failed to rename export' });
  }
};

// Function to sanitize file names by replacing invalid characters
const sanitizeFileName = (name: string): string => {
  const invalidChars = /[\\/:*?"<>|]/g;
  return name.replace(invalidChars, '_');
};

export const downloadClip: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const clipsMetadataPath = path.join(__dirname, '../../processed/clips.json');
    const clipsMetadata = JSON.parse(await fs.readFile(clipsMetadataPath, 'utf8'));
    const clip = clipsMetadata[id];
    if (!clip) {
      res.status(404).json({ error: 'Clip not found' });
      return;
    }
    const filePath = path.join(__dirname, `../../${clip.path}`);
    const sanitizedLabel = sanitizeFileName(clip.label);
    const downloadFileName = sanitizedLabel ? `${sanitizedLabel}.mp4` : `clip-${id}.mp4`;
    res.download(filePath, downloadFileName);
  } catch (err) {
    console.error('Error downloading clip:', err);
    res.status(500).json({ error: 'Failed to download clip' });
  }
};

export const downloadExport: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const exportsMetadataPath = path.join(__dirname, '../../processed/exports.json');
    const exportsMetadata = JSON.parse(await fs.readFile(exportsMetadataPath, 'utf8'));
    const exportItem = exportsMetadata[id];
    if (!exportItem) {
      res.status(404).json({ error: 'Export not found' });
      return;
    }
    const filePath = path.join(__dirname, `../../${exportItem.path}`);
    const sanitizedLabel = sanitizeFileName(exportItem.label);
    const downloadFileName = sanitizedLabel ? `${sanitizedLabel}.mp4` : `export-${id}.mp4`;
    res.download(filePath, downloadFileName);
  } catch (err) {
    console.error('Error downloading export:', err);
    res.status(500).json({ error: 'Failed to download export' });
  }
};

// Add this endpoint to your exports
export const getExportProgress: RequestHandler = async (req, res) => {
  const { exportId } = req.params;
  
  if (!exportId) {
    res.status(400).json({ error: 'Export ID is required' });
  } else if (!exportProgressTracker[exportId]) {
    res.status(404).json({ error: 'Export not found or no progress data available' });
  } else {
    res.status(200).json({ progress: exportProgressTracker[exportId] });
  }
};