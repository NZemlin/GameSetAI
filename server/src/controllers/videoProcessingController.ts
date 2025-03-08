import { Request, Response, RequestHandler } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

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
}

// Interface for export metadata
interface ExportMetadata {
  id: string;
  sourceVideoId: string;
  points: number;
  includeScoreboard: boolean;
  path: string;
  createdAt: string;
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
  return new Promise(resolve => {
    const { exec } = require('child_process');
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    console.log(`Checking FFmpeg at path: ${ffmpegPath}`);
    
    // Use quotes around the FFmpeg path for Windows compatibility
    exec(`"${ffmpegPath}" -version`, { windowsHide: true }, (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.error('FFmpeg check error:', error.message);
        resolve(false);
        return;
      }
      
      if (stdout) {
        console.log('FFmpeg detected successfully');
        console.log('FFmpeg version info:', stdout.split('\n')[0]);
      }
      
      resolve(true);
    });
  });
};

// Export the FFmpeg check function as a RequestHandler
export const checkFfmpegStatus: RequestHandler = async (req, res) => {
  try {
    const isInstalled = await checkFfmpegInstalled();
    res.json({ installed: isInstalled });
  } catch (err) {
    console.error('Error checking FFmpeg status:', err);
    res.json({ installed: false, error: 'Error checking FFmpeg status' });
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
    createdAt: new Date().toISOString()
  };
  
  return clipMetadata;
};

/**
 * Creates a clip from a video using the specified start and end times
 */
export const createClip: RequestHandler<any, any> = async (req, res) => {
  await ensureProcessedDir();
  
  try {
    const { videoId, startTime, endTime, label } = req.body;
    
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
    
    if (isFfmpegInstalled) {
      const inputPath = path.join(uploadsDir, videoFile);
      const outputFilename = `${clipId}.mp4`;
      const outputPath = path.join(processedVideosPath, outputFilename);
      
      // Use FFmpeg to create the clip
      await new Promise<void>((resolve, reject) => {
        const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
        const ffmpegCommand = `"${ffmpegPath}" -ss ${startTime} -i "${inputPath}" -to ${endTime - startTime} -c copy -avoid_negative_ts 1 "${outputPath}"`;
        
        exec(ffmpegCommand, (error, stdout, stderr) => {
          if (error) {
            console.error(`FFmpeg error: ${error.message}`);
            reject(error);
            return;
          }
          resolve();
        });
      });
      
      // Store clip metadata
      clipMetadata = {
        id: clipId,
        sourceVideoId: videoId,
        startTime,
        endTime,
        label: label || `Clip from ${startTime.toFixed(2)} to ${endTime.toFixed(2)}`,
        path: `processed/${outputFilename}`,
        createdAt: new Date().toISOString()
      };
    } else {
      // If FFmpeg is not installed, create mock clip metadata
      console.warn('FFmpeg not installed. Creating mock clip metadata only.');
      clipMetadata = await createMockClip(videoId, clipId, startTime, endTime, label || `Clip from ${startTime.toFixed(2)} to ${endTime.toFixed(2)}`);
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
    const tempFiles: string[] = [];
    
    // Check if FFmpeg is installed
    const isFfmpegInstalled = await checkFfmpegInstalled();
    
    if (!isFfmpegInstalled) {
      console.warn('FFmpeg not installed. Creating mock clip metadata only.');
      
      // Create mock clips without actual processing
      for (const [index, clip] of clips.entries()) {
        const { startTime, endTime, label } = clip;
        const clipId = uuidv4();
        
        const clipMetadata = await createMockClip(
          videoId,
          clipId,
          startTime,
          endTime,
          label || `Clip ${index + 1}`
        );
        
        outputClips.push(clipMetadata);
      }
      
      // Save metadata
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
      
      await fs.writeFile(clipsMetadataPath, JSON.stringify(clipsMetadata, null, 2));
      
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
      await new Promise<void>((resolve, reject) => {
        const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
        const ffmpegCommand = `"${ffmpegPath}" -ss ${startTime} -i "${inputPath}" -to ${endTime - startTime} -c copy -avoid_negative_ts 1 "${tempPath}"`;
        
        exec(ffmpegCommand, (error, stdout, stderr) => {
          if (error) {
            console.error(`FFmpeg error: ${error.message}`);
            reject(error);
            return;
          }
          resolve();
        });
      });
      
      // Store clip metadata
      const clipMetadata: ClipMetadata = {
        id: clipId,
        sourceVideoId: videoId,
        startTime,
        endTime,
        label: label || `Clip ${index + 1}`,
        path: `processed/${outputFilename}`,
        createdAt: new Date().toISOString()
      };
      
      outputClips.push(clipMetadata);
    }
    
    // If requested, combine all clips into a single video
    if (combineClips && tempFiles.length > 0) {
      const combinedId = uuidv4();
      const combinedFilename = `${combinedId}.${outputFormat}`;
      const combinedPath = path.join(processedVideosPath, combinedFilename);
      
      // Create a text file listing all temp files for ffmpeg input
      const listFilePath = path.join(processedVideosPath, `${combinedId}_list.txt`);
      const fileList = tempFiles.map(file => `file '${file}'`).join('\n');
      await fs.writeFile(listFilePath, fileList, 'utf8');
      
      // Combine clips
      await new Promise<void>((resolve, reject) => {
        const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
        const ffmpegCommand = `"${ffmpegPath}" -f concat -safe 0 -i "${listFilePath}" -c copy "${combinedPath}"`;
        
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
      
      await fs.unlink(listFilePath);
      
      // Create metadata for combined clip
      const combinedMetadata: ClipMetadata = {
        id: combinedId,
        sourceVideoId: videoId,
        startTime: outputClips[0].startTime,
        endTime: outputClips[outputClips.length - 1].endTime,
        isCompilation: true,
        sourceClips: [...outputClips],
        label: 'Combined Clips',
        path: `processed/${combinedFilename}`,
        createdAt: new Date().toISOString()
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
    
    await fs.writeFile(clipsMetadataPath, JSON.stringify(clipsMetadata, null, 2));
    
    res.status(200).json({
      message: 'Clips created successfully',
      clips: outputClips
    });
  } catch (error) {
    console.error('Error creating clips:', error);
    res.status(500).json({ error: 'Failed to create clips' });
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

/**
 * Exports a match video with selected points and optional scoreboard
 */
export const exportMatchVideo: RequestHandler = async (req, res) => {
  await ensureProcessedDir();
  
  try {
    const { videoId, points, includeScoreboard = false } = req.body;
    
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
    
    const inputPath = path.join(uploadsDir, videoFile);
    const exportId = uuidv4();
    const outputFilename = `export_${exportId}.mp4`;
    const outputPath = path.join(processedVideosPath, outputFilename);
    
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
        createdAt: new Date().toISOString()
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
      await fs.writeFile(exportsMetadataPath, JSON.stringify(exportsMetadata, null, 2));
      
      res.status(200).json({
        message: 'Mock export created (FFmpeg not installed)',
        export: exportMetadata,
        ffmpegInstalled: false
      });
      return;
    }
    
    // Create temporary clip files for each point
    const tempFiles: string[] = [];
    const listFilePath = path.join(processedVideosPath, `${exportId}_list.txt`);
    
    // Filter out any points with invalid timestamps
    const validPoints = points.filter(
      point => point.startTime !== null && point.endTime !== null
    );
    
    if (validPoints.length === 0) {
      res.status(400).json({ error: 'No valid points with timestamps provided' });
      return;
    }
    
    // Create individual clip for each point
    for (const [index, point] of validPoints.entries()) {
      const tempFilename = `temp_point_${index}_${exportId}.mp4`;
      const tempPath = path.join(processedVideosPath, tempFilename);
      tempFiles.push(tempPath);
      
      // Extract the clip for this point
      await new Promise<void>((resolve, reject) => {
        const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
        const ffmpegCommand = `"${ffmpegPath}" -ss ${point.startTime} -i "${inputPath}" -to ${point.endTime - point.startTime} -c copy -avoid_negative_ts 1 "${tempPath}"`;
        
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
    
    // Create a text file listing all temp files for FFmpeg input
    const fileList = tempFiles.map(file => `file '${file}'`).join('\n');
    await fs.writeFile(listFilePath, fileList, 'utf8');
    
    // Combine clips
    await new Promise<void>((resolve, reject) => {
      const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
      const ffmpegCommand = `"${ffmpegPath}" -f concat -safe 0 -i "${listFilePath}" -c copy "${outputPath}"`;
      
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
    await fs.unlink(listFilePath);
    
    // Store export metadata
    const exportMetadata: ExportMetadata = {
      id: exportId,
      sourceVideoId: videoId,
      points: validPoints.length,
      includeScoreboard,
      path: `processed/${outputFilename}`,
      createdAt: new Date().toISOString()
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
    
    res.status(200).json({
      message: 'Match video exported successfully',
      export: exportMetadata,
      ffmpegInstalled: true
    });
  } catch (error) {
    console.error('Error exporting match video:', error);
    res.status(500).json({ error: 'Failed to export match video' });
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