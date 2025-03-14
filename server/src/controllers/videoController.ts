import { Request, Response, NextFunction, RequestHandler } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getVideoInfo } from './videoProcessingController';

interface VideoMetadata {
  [key: string]: {
    name: string;
    originalFilename: string;
    uploadDate: string;
  };
}

const metadataPath = path.join(__dirname, '../../uploads/metadata.json');

async function getMetadata(): Promise<VideoMetadata> {
  try {
    try {
      await fs.access(metadataPath);
    } catch {
      // If file doesn't exist, create it with an empty object
      await fs.writeFile(metadataPath, '{}', 'utf8');
    }
    const data = await fs.readFile(metadataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading metadata:', error);
    return {};
  }
}

async function saveMetadata(metadata: VideoMetadata): Promise<void> {
  try {
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.error('Error saving metadata:', error);
    throw error;
  }
}

export const listVideos: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const uploadsDir = path.join(__dirname, '../../uploads');
    const files = await fs.readdir(uploadsDir);
    const metadata = await getMetadata();

    const videos = await Promise.all(
      files
        .filter(filename => filename !== 'metadata.json' && filename !== '.gitkeep')
        .map(async (filename) => {
          const filePath = path.join(uploadsDir, filename);
          const stats = await fs.stat(filePath);
          const id = filename.split('.')[0];

          return {
            id,
            filename,
            name: metadata[id]?.name || filename,
            path: `uploads/${filename}`,
            createdAt: metadata[id]?.uploadDate || stats.birthtime.toISOString(),
          };
        })
    );

    // Sort by creation date, newest first
    videos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ videos });
  } catch (error) {
    next(error);
  }
};

export const renameVideo: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const metadata = await getMetadata();
    const uploadsDir = path.join(__dirname, '../../uploads');
    const files = await fs.readdir(uploadsDir);

    // Find the actual video file corresponding to the id
    const videoFile = files.find(filename => filename.startsWith(id + '.'));

    if (!videoFile) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    if (!metadata[id]) {
      // Create new metadata with the actual filename
      metadata[id] = {
        name: name.trim(),
        uploadDate: new Date().toISOString(),
        originalFilename: videoFile,
      };
    } else {
      // Update existing metadata
      metadata[id] = {
        ...metadata[id],
        name: name.trim(),
      };
    }

    await saveMetadata(metadata);

    res.json({
      message: 'Video renamed successfully',
      video: {
        id,
        name: metadata[id].name,
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getVideo: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const uploadsDir = path.join(__dirname, '../../uploads');
    const files = await fs.readdir(uploadsDir);
    const metadata = await getMetadata();

    // Log information to help diagnose issues
    console.log(`Looking for video with ID: ${id}`);
    console.log(`Available files in uploads directory:`, files);
    
    // Find the video file
    const videoFile = files.find(filename => filename.startsWith(id));

    if (!videoFile) {
      console.error(`No matching file found for ID: ${id}`);
      res.status(404).json({ error: 'Video not found' });
      return;
    }
    
    console.log(`Found video file: ${videoFile}`);

    const filePath = path.join(uploadsDir, videoFile);
    const stats = await fs.stat(filePath);

    // Return the video information with the path in the format expected by the client
    res.status(200).json({
      video: {
        id,
        filename: videoFile,
        name: metadata[id]?.name || videoFile,
        path: `uploads/${videoFile}`, // Remove the leading slash to maintain compatibility
        createdAt: metadata[id]?.uploadDate || stats.birthtime.toISOString()
      }
    });

    // Prefetch video info for export optimization (non-blocking)
    setTimeout(() => {
      getVideoInfo(id).catch((err: Error) => {
        // Silently fail - this is just an optimization
        console.warn(`Failed to prefetch video info for ${id}:`, err);
      });
    }, 0);

  } catch (error) {
    next(error);
  }
};

export const deleteVideo: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const uploadsDir = path.join(__dirname, '../../uploads');
    const processedDir = path.join(__dirname, '../../processed');
    const dataDir = path.join(__dirname, '../../data');

    // Get metadata
    const metadata = await getMetadata();

    // Check if video exists in metadata
    if (!metadata[id]) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    // Get the original filename from metadata (includes extension)
    const originalFilename = metadata[id].originalFilename;
    const videoPath = path.join(uploadsDir, originalFilename);

    // Delete the original video file
    try {
      await fs.unlink(videoPath);
      console.log(`Successfully deleted original video file: ${videoPath}`);
    } catch (err) {
      console.error(`Error deleting original video file: ${err}`);
      // Continue anyway - file might not exist
    }

    // Delete the processed video file if it exists
    const processedVideoPath = path.join(processedDir, `${id}.mp4`);
    try {
      await fs.unlink(processedVideoPath);
      console.log(`Successfully deleted processed video file: ${processedVideoPath}`);
    } catch (err) {
      console.error(`Error deleting processed video file: ${err}`);
      // Ignore if processed file doesn't exist
    }

    // Delete associated clips
    const clipsPath = path.join(processedDir, 'clips.json');
    try {
      let clipsData: { [key: string]: any } = {};
      try {
        const clipsContent = await fs.readFile(clipsPath, 'utf8');
        clipsData = JSON.parse(clipsContent);
      } catch (readErr) {
        console.log("No clips.json found or it's empty; proceeding with empty object");
      }

      for (const [clipId, clip] of Object.entries(clipsData)) {
        if (clip.sourceVideoId === id) {
          try {
            const clipFilePath = path.join(__dirname, '../../', clip.path);
            await fs.unlink(clipFilePath);
            console.log(`Deleted clip file: ${clip.path}`);
          } catch (err) {
            console.error(`Error deleting clip file ${clip.path}:`, err);
          }
          delete clipsData[clipId];
        }
      }
      await fs.writeFile(clipsPath, JSON.stringify(clipsData, null, 2));
      console.log('Updated clips.json successfully');
    } catch (err) {
      console.error('Error handling clips during video deletion:', err);
    }

    // Delete associated exports
    const exportsPath = path.join(processedDir, 'exports.json');
    try {
      let exportsData: { [key: string]: any } = {};
      try {
        const exportsContent = await fs.readFile(exportsPath, 'utf8');
        exportsData = JSON.parse(exportsContent);
      } catch (readErr) {
        console.log("No exports.json found or it's empty; proceeding with empty object");
      }

      for (const [exportId, exp] of Object.entries(exportsData)) {
        if (exp.sourceVideoId === id) {
          try {
            const exportFilePath = path.join(__dirname, '../../', exp.path);
            await fs.unlink(exportFilePath);
            console.log(`Deleted export file: ${exp.path}`);
          } catch (err) {
            console.error(`Error deleting export file ${exp.path}:`, err);
          }
          delete exportsData[exportId];
        }
      }
      await fs.writeFile(exportsPath, JSON.stringify(exportsData, null, 2));
      console.log('Updated exports.json successfully');
    } catch (err) {
      console.error('Error handling exports during video deletion:', err);
    }

    // Delete associated match data
    try {
      const matchDataPath = path.join(dataDir, 'match_data.json');
      let matchData: { [key: string]: any } = {};
      
      try {
        const matchContent = await fs.readFile(matchDataPath, 'utf8');
        matchData = JSON.parse(matchContent);
        
        if (matchData[id]) {
          delete matchData[id];
          await fs.writeFile(matchDataPath, JSON.stringify(matchData, null, 2));
          console.log(`Successfully deleted match data for video ID: ${id}`);
        } else {
          console.log(`No match data found for video ID: ${id}`);
        }
      } catch (readErr) {
        console.log("No match_data.json found or it's empty; no match data to delete");
      }
    } catch (err) {
      console.error(`Error deleting match data for video ID: ${id}:`, err);
    }

    // Remove video from metadata
    delete metadata[id];
    await saveMetadata(metadata);
    console.log('Metadata updated successfully');

    // Send success response
    res.status(200).json({ success: true, message: 'Video and associated clips, exports, and match data deleted successfully' });
  } catch (error) {
    next(error);
  }
};