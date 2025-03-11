import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';

// Configure multer for video upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate a unique filename with original extension
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueId}${extension}`);
  },
});

// File filter to only allow video files
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only MP4, MOV, and AVI files are allowed.'));
  }
};

// Configure multer with our options
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB
  },
});

// Store video metadata in a JSON file
const metadataPath = path.join(__dirname, '../../uploads/metadata.json');

interface VideoMetadata {
  [key: string]: {
    name: string;
    originalFilename: string;
    uploadDate: string;
  };
}

async function getMetadata(): Promise<VideoMetadata> {
  try {
    const data = await fs.readFile(metadataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

async function saveMetadata(metadata: VideoMetadata): Promise<void> {
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
}

// Controller function for handling video uploads
export const handleVideoUpload = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const videoName = req.body.name || req.file.originalname.split('.')[0];
    const fileId = req.file.filename.split('.')[0];

    // Save metadata with server-generated filename
    const metadata = await getMetadata();
    metadata[fileId] = {
      name: videoName,
      originalFilename: req.file.filename,
      uploadDate: new Date().toISOString(),
    };
    await saveMetadata(metadata);

    res.status(200).json({
      message: 'File uploaded successfully',
      file: {
        id: fileId,
        filename: req.file.filename,
        name: videoName,
        path: req.file.path,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};