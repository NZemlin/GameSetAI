import express from 'express';
import { upload, handleVideoUpload } from '../controllers/uploadController';

const router = express.Router();

// Route for video upload
router.post('/upload', upload.single('video'), handleVideoUpload);

export default router; 