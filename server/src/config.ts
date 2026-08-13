import path from 'path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: Number(process.env.PORT) || 3000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  dataDir: path.resolve(__dirname, '../../data'),
  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
};

export const paths = {
  videosDir: path.join(config.dataDir, 'videos', 'files'),
  videosIndex: path.join(config.dataDir, 'videos', 'index.json'),
  matchesDir: path.join(config.dataDir, 'matches'),
  clipsDir: path.join(config.dataDir, 'clips', 'files'),
  clipsIndex: path.join(config.dataDir, 'clips', 'index.json'),
  exportsDir: path.join(config.dataDir, 'exports', 'files'),
  exportsIndex: path.join(config.dataDir, 'exports', 'index.json'),
};
