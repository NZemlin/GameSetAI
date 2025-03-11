import { Request, Response, NextFunction, RequestHandler } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Define the Points interface to match the client's Point type
interface Point {
  startTime: number | null;
  endTime: number | null;
  winner: 1 | 2 | null;
  scoreState?: {
    player1: any;
    player2: any;
    inTiebreak: boolean;
  };
  divider?: 'set' | 'game' | 'tiebreak' | 'tiebreak-start';
}

// Define the MatchConfig interface to match the client's PersistedMatchConfig
interface MatchConfig {
  type: 'match' | 'tiebreak' | null;
  tiebreakPoints: 7 | 10;
  noAd: boolean;
  firstServer: 1 | 2 | null;
  isConfigured: boolean;
}

// Define the VideoMatchData interface for all match-related data
interface VideoMatchData {
  [videoId: string]: {
    points: Point[];
    matchConfig?: MatchConfig;
    playerNames?: {
      player1: string;
      player2: string;
    };
    lastUpdated: string;
  };
}

// Path to the match data file
const matchDataPath = path.join(__dirname, '../../../data/match_data.json');

// Ensure the data directory exists
async function ensureDataDir() {
  const dataDir = path.join(__dirname, '../../../data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Get all video match data
async function getMatchData(): Promise<VideoMatchData> {
  try {
    await ensureDataDir();
    try {
      await fs.access(matchDataPath);
    } catch {
      // If file doesn't exist, create it with an empty object
      await fs.writeFile(matchDataPath, '{}', 'utf8');
      return {};
    }
    const data = await fs.readFile(matchDataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading match data:', error);
    return {};
  }
}

// Save video match data
async function saveMatchData(matchData: VideoMatchData): Promise<void> {
  try {
    await ensureDataDir();
    await fs.writeFile(matchDataPath, JSON.stringify(matchData, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving match data:', error);
    throw error;
  }
}

// Get points for a specific video
export const getVideoPoints: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { videoId } = req.params;
    const matchData = await getMatchData();
    
    // If no data exists for this video, return an empty array
    if (!matchData[videoId]) {
      res.json({ 
        points: [],
        lastUpdated: null
      });
      return;
    }
    
    res.json(matchData[videoId]);
  } catch (error) {
    console.error('Error getting video points:', error);
    next(error);
  }
};

// Save points for a specific video
export const saveVideoPoints: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { videoId } = req.params;
    const { points, matchConfig, playerNames } = req.body;
    
    if (!Array.isArray(points)) {
      res.status(400).json({ error: 'Points must be an array' });
      return;
    }
    
    const matchData = await getMatchData();
    
    // Update or create the data for this video
    matchData[videoId] = {
      points,
      matchConfig,
      playerNames,
      lastUpdated: new Date().toISOString()
    };
    
    await saveMatchData(matchData);
    
    res.json({ 
      success: true, 
      message: 'Points saved successfully',
      videoId,
      pointsCount: points.length,
      lastUpdated: matchData[videoId].lastUpdated
    });
  } catch (error) {
    console.error('Error saving video points:', error);
    next(error);
  }
};

// Delete points for a specific video
export const deleteVideoPoints: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { videoId } = req.params;
    const matchData = await getMatchData();
    
    // If no data exists for this video, return success
    if (!matchData[videoId]) {
      res.json({ 
        success: true,
        message: 'No points found for this video'
      });
      return;
    }
    
    delete matchData[videoId];
    
    await saveMatchData(matchData);
    
    res.json({ 
      success: true,
      message: 'Points deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting video points:', error);
    next(error);
  }
};

// Reset points for a specific video
export const resetVideoPoints: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { videoId } = req.params;
    const matchData = await getMatchData();
    
    // If no data exists for this video, return success
    if (!matchData[videoId]) {
      res.json({ 
        success: true,
        message: 'No points found for this video'
      });
      return;
    }
    
    // Reset the data for this video to an empty state
    matchData[videoId] = {
      points: [],
      lastUpdated: new Date().toISOString()
    };
    
    await saveMatchData(matchData);
    
    res.json({ 
      success: true,
      message: 'Points reset successfully',
      lastUpdated: matchData[videoId].lastUpdated
    });
  } catch (error) {
    console.error('Error resetting video points:', error);
    next(error);
  }
}; 