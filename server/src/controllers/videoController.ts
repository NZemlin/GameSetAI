import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';

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
      // If file doesn't exist, create it with empty object
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

export const listVideos = async (req: Request, res: Response) => {
  try {
    const uploadsDir = path.join(__dirname, '../../uploads');
    const files = await fs.readdir(uploadsDir);
    const metadata = await getMetadata();
    
    const videos = await Promise.all(
      files
        .filter(filename => filename !== 'metadata.json')
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
    console.error('Error listing videos:', error);
    res.status(500).json({ error: 'Failed to list videos' });
  }
};

export const renameVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const metadata = await getMetadata();
    
    // Check if video exists in metadata or filesystem
    const uploadsDir = path.join(__dirname, '../../uploads');
    const files = await fs.readdir(uploadsDir);
    const videoExists = files.some(filename => filename.startsWith(id));

    if (!videoExists) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    // Create or update metadata entry
    metadata[id] = {
      ...metadata[id],
      name: name.trim(),
      uploadDate: metadata[id]?.uploadDate || new Date().toISOString(),
      originalFilename: metadata[id]?.originalFilename || `${id}.mp4`,
    };

    await saveMetadata(metadata);

    res.json({ 
      message: 'Video renamed successfully',
      video: {
        id,
        name: metadata[id].name,
      }
    });
  } catch (error) {
    console.error('Error renaming video:', error);
    res.status(500).json({ error: 'Failed to rename video' });
  }
};

export const getVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const uploadsDir = path.join(__dirname, '../../uploads');
    const files = await fs.readdir(uploadsDir);
    const metadata = await getMetadata();

    // Find the video file
    const videoFile = files.find(filename => filename.startsWith(id));
    
    if (!videoFile) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    const filePath = path.join(uploadsDir, videoFile);
    const stats = await fs.stat(filePath);

    const video = {
      id,
      filename: videoFile,
      name: metadata[id]?.name || videoFile,
      path: `uploads/${videoFile}`,
      createdAt: metadata[id]?.uploadDate || stats.birthtime.toISOString(),
    };

    res.json({ video });
  } catch (error) {
    console.error('Error getting video:', error);
    res.status(500).json({ error: 'Failed to get video' });
  }
}; 