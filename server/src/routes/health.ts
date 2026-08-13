import { Router } from 'express';
import { ffmpegAvailable } from '../video/ffmpeg';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  const ffmpeg = await ffmpegAvailable();
  res.json({ ok: true, ffmpeg });
});
