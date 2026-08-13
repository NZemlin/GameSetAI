import { Router } from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { asAuthed, requireAuth } from '../auth';
import { paths } from '../config';
import { createSupabaseStore } from '../storage/supabase';
import { buildHighlight, buildSingleClip, exportProgress, newExportId } from '../video/export';

export function processingRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  const storeOf = (req: Parameters<typeof asAuthed>[0]) => {
    const { supabase, user } = asAuthed(req);
    return createSupabaseStore(supabase, user.id);
  };

  router.get('/videos/:id/clips', async (req, res, next) => {
    try {
      res.json({ clips: await storeOf(req).listClips(req.params.id) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/videos/:id/clips', async (req, res, next) => {
    try {
      const store = storeOf(req);
      const video = await store.getVideo(req.params.id);
      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }
      const { startTime, endTime, label, includeScoreboard, pointIndex } = req.body ?? {};
      if (typeof startTime !== 'number' || typeof endTime !== 'number' || endTime <= startTime) {
        res.status(400).json({ error: 'Valid startTime and endTime are required' });
        return;
      }
      const match = await store.getMatch(video.id);
      const id = uuidv4();
      const filename = `${id}.mp4`;
      const outputPath = path.join(paths.clipsDir, filename);
      await buildSingleClip({
        inputPath: path.join(paths.videosDir, video.filename),
        outputPath,
        startTime,
        endTime,
        includeScoreboard: Boolean(includeScoreboard),
        config: match?.config ?? null,
        names: match?.playerNames ?? { player1: 'Player 1', player2: 'Player 2' },
        points: match?.points ?? [],
        pointIndex: typeof pointIndex === 'number' ? pointIndex : 0,
      });
      const clip = await store.saveClip({
        id,
        videoId: video.id,
        startTime,
        endTime,
        label: typeof label === 'string' && label.trim() ? label.trim() : `Clip ${formatClock(startTime)}`,
        filename,
        includeScoreboard: Boolean(includeScoreboard),
        createdAt: new Date().toISOString(),
      });
      res.status(201).json({ clip });
    } catch (error) {
      next(error);
    }
  });

  router.get('/clips/:id/file', async (req, res, next) => {
    try {
      const clip = await storeOf(req).getClip(req.params.id);
      if (!clip) {
        res.status(404).json({ error: 'Clip not found' });
        return;
      }
      res.sendFile(path.join(paths.clipsDir, clip.filename));
    } catch (error) {
      next(error);
    }
  });

  router.patch('/clips/:id', async (req, res, next) => {
    try {
      const store = storeOf(req);
      const clip = await store.getClip(req.params.id);
      if (!clip) {
        res.status(404).json({ error: 'Clip not found' });
        return;
      }
      const label = typeof req.body.label === 'string' ? req.body.label.trim() : '';
      if (!label) {
        res.status(400).json({ error: 'label is required' });
        return;
      }
      const updated = await store.saveClip({ ...clip, label });
      res.json({ clip: updated });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/clips/:id', async (req, res, next) => {
    try {
      const deleted = await storeOf(req).deleteClip(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Clip not found' });
        return;
      }
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.get('/videos/:id/exports', async (req, res, next) => {
    try {
      res.json({ exports: await storeOf(req).listExports(req.params.id) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/videos/:id/exports', async (req, res, next) => {
    try {
      const store = storeOf(req);
      const video = await store.getVideo(req.params.id);
      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }
      const match = await store.getMatch(video.id);
      const points = Array.isArray(req.body.points) ? req.body.points : match?.points ?? [];
      const includeScoreboard = Boolean(req.body.includeScoreboard);
      const exportId = newExportId();
      const filename = `${exportId}.mp4`;
      const date = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
      const label =
        typeof req.body.label === 'string' && req.body.label.trim()
          ? req.body.label.trim()
          : `${video.name} — Highlights (${date})`;

      res.status(202).json({ exportId, message: 'Export started' });

      buildHighlight({
        exportId,
        inputPath: path.join(paths.videosDir, video.filename),
        outputPath: path.join(paths.exportsDir, filename),
        points,
        config: match?.config ?? null,
        names: match?.playerNames ?? { player1: 'Player 1', player2: 'Player 2' },
        includeScoreboard,
      })
        .then(async () => {
          await store.saveExport({
            id: exportId,
            videoId: video.id,
            label,
            filename,
            pointCount: points.filter((point: { winner: unknown }) => point.winner != null).length,
            includeScoreboard,
            createdAt: new Date().toISOString(),
          });
        })
        .catch((error) => {
          console.error('Export failed:', error);
        });
    } catch (error) {
      next(error);
    }
  });

  router.get('/exports/:id/progress', (req, res) => {
    const progress = exportProgress[req.params.id];
    if (!progress) {
      res.status(404).json({ error: 'Export not found' });
      return;
    }
    res.json({ progress });
  });

  router.get('/exports/:id/file', async (req, res, next) => {
    try {
      const record = await storeOf(req).getExport(req.params.id);
      if (!record) {
        res.status(404).json({ error: 'Export not found' });
        return;
      }
      res.download(path.join(paths.exportsDir, record.filename), `${record.label}.mp4`);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/exports/:id', async (req, res, next) => {
    try {
      const store = storeOf(req);
      const record = await store.getExport(req.params.id);
      if (!record) {
        res.status(404).json({ error: 'Export not found' });
        return;
      }
      const label = typeof req.body.label === 'string' ? req.body.label.trim() : '';
      if (!label) {
        res.status(400).json({ error: 'label is required' });
        return;
      }
      const updated = await store.saveExport({ ...record, label });
      res.json({ export: updated });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/exports/:id', async (req, res, next) => {
    try {
      const deleted = await storeOf(req).deleteExport(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Export not found' });
        return;
      }
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
