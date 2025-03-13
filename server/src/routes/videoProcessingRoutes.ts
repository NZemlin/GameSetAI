import express, { Request, Response, NextFunction } from 'express';
import { 
  listClips, 
  getClip, 
  deleteClip, 
  createClip, 
  createClips, 
  exportMatchVideo,
  checkFfmpegStatus,
  listExports,
  deleteExport,
  renameClip,
  renameExport,
  downloadClip,
  downloadExport,
  getExportProgress
} from '../controllers/videoProcessingController';
import path from 'path';
import fs from 'fs/promises'; // For reading metadata files

const router = express.Router();

// Check if FFmpeg is installed
// GET /api/processing/ffmpeg-status
router.get('/ffmpeg-status', checkFfmpegStatus);

// Routes for clips
// GET /api/processing/clips - List all clips
router.get('/clips', listClips);

// GET /api/processing/clips/:id - Get a specific clip by ID
router.get('/clips/:id', getClip);

// DELETE /api/processing/clips/:id - Delete a specific clip by ID
router.delete('/clips/:id', deleteClip);

// PUT /api/processing/clips/:id/rename - Rename a specific clip by ID
router.put('/clips/:id/rename', renameClip);

// POST /api/processing/clip - Create a single clip
router.post('/clip', createClip);

// POST /api/processing/clips - Create multiple clips
router.post('/clips', createClips);

// POST /api/processing/export - Export a match video
router.post('/export', exportMatchVideo);

// GET /api/processing/exports - List all exports
router.get('/exports', listExports);

// DELETE /api/processing/exports/:id - Delete a specific export by ID
router.delete('/exports/:id', deleteExport);

// PUT /api/processing/exports/:id/rename - Rename a specific export by ID
router.put('/exports/:id/rename', renameExport);

// New route: Download a specific clip by ID
router.get('/download/clip/:id', downloadClip);

// New route: Download a specific export by ID
router.get('/download/export/:id', downloadExport);

// New route: Get export progress
router.get('/export-progress/:exportId', getExportProgress);

// Handle 404 errors for undefined routes within /api/processing
router.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested endpoint ${req.method} ${req.url} does not exist within /api/processing.`,
  });
});

export default router;