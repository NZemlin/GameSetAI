import express from 'express';
import { upload, handleVideoUpload } from '../controllers/uploadController';
import { listVideos, renameVideo, getVideo, deleteVideo } from '../controllers/videoController';

const router = express.Router();

// Route for video upload
router.post('/upload', upload.single('video'), handleVideoUpload);

// Route for listing videos
router.get('/videos', listVideos);

// Route for getting a single video
router.get('/videos/:id', getVideo);

// Route for renaming video
router.put('/videos/:id/rename', renameVideo);

// Route for deleting video
router.delete('/videos/:id', deleteVideo);

export default router;