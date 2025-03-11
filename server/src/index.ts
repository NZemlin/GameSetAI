import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import videoRoutes from './routes/videoRoutes';
import videoProcessingRoutes from './routes/videoProcessingRoutes';
import authRoutes from './routes/authRoutes';
import matchRoutes from './routes/matchRoutes';

// Load .env file explicitly from the project root
const result = config({ path: path.resolve(__dirname, '../../.env') });
if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('Loaded .env file successfully');
  console.log('Parsed SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('Parsed SUPABASE_ANON_KEY (partial):', process.env.SUPABASE_ANON_KEY?.slice(0, 10) + '...');
}

// Initialize Supabase clients
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error('SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY must be defined in environment variables');
}

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key (partial):', supabaseAnonKey.slice(0, 10) + '...');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// Log diagnostics
console.log('FFMPEG_PATH from .env:', process.env.FFMPEG_PATH);
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for the React frontend
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/processed', express.static(path.join(__dirname, '../processed')));

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

const logRoutes = (router: any, label: string) => {
  const routes = router.stack
    .filter((layer: any) => layer.route)
    .map((layer: any) => `${layer.route.path} (${Object.keys(layer.route.methods).join(', ')})`);
  console.log(`${label}:`, routes);
};

logRoutes(videoRoutes, 'Loading video routes from');
logRoutes(videoProcessingRoutes, 'Loading video processing routes from');
logRoutes(authRoutes, 'Loading auth routes from');
logRoutes(matchRoutes, 'Loading match routes from');

app.use('/api/auth', authRoutes);
app.use('/api', videoRoutes);
app.use('/api/processing', videoProcessingRoutes);
app.use('/api/match', matchRoutes);

app.get('/api/processing/ffmpeg-status', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    ffmpegPath: process.env.FFMPEG_PATH || 'Not configured',
    message: 'FFmpeg status endpoint is working',
  });
});

app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested endpoint ${req.method} ${req.url} does not exist.`,
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong on the server.',
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});