import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import { config } from './config';
import { initStore } from './storage/fs';
import { healthRouter } from './routes/health';
import { videosRouter } from './routes/videos';
import { matchesRouter } from './routes/matches';
import { processingRouter } from './routes/processing';
import { shareRouter } from './routes/share';
import { profileRouter } from './routes/profile';
import { foldersRouter } from './routes/folders';

async function main(): Promise<void> {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  }

  await initStore();
  const app = express();

  app.use(
    cors({
      origin: config.clientUrl,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json({ limit: '4mb' }));

  app.use('/api', healthRouter);
  app.use('/api', profileRouter());
  app.use('/api', foldersRouter());
  app.use('/api', shareRouter());
  app.use('/api', videosRouter());
  app.use('/api', matchesRouter());
  app.use('/api', processingRouter());

  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found', message: `${req.method} ${req.path}` });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  app.listen(config.port, () => {
    console.log(`GameSetAI API on http://localhost:${config.port}`);
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
