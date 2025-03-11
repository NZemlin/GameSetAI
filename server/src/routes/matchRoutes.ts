import express from 'express';
import { 
  getVideoMatchData, 
  saveVideoMatchData, 
  deleteVideoMatchData,
  resetVideoMatchData
} from '../controllers/match/matchController';

const router = express.Router();

// Get match data for a specific video
router.get('/videos/:videoId/match', getVideoMatchData);

// Save match data for a specific video
router.post('/videos/:videoId/match', saveVideoMatchData);

// Delete match data for a specific video
router.delete('/videos/:videoId/match', deleteVideoMatchData);

// Reset match data for a specific video
router.post('/videos/:videoId/match/reset', resetVideoMatchData);

export default router; 