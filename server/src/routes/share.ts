import { Router } from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { MatchConfig, Point } from '@gamesetai/scoring';
import { createUserClient } from '../auth';
import { paths } from '../config';
import {
  deleteSharedClip,
  deleteSharedExport,
  getSharedBundle,
  getSharedClip,
  getSharedExport,
  listSharedClips,
  listSharedExports,
  saveSharedClip,
  saveSharedExport,
  saveSharedMatch,
} from '../storage/supabase';
import { buildHighlight, buildSingleClip, exportProgress, newExportId } from '../video/export';

function emptyMatch(videoId: string) {
  return {
    videoId,
    config: null as MatchConfig | null,
    playerNames: { player1: 'Player 1', player2: 'Player 2' },
    points: [] as Point[],
    updatedAt: new Date().toISOString(),
  };
}

export function shareRouter(): Router {
  const router = Router();

  router.get('/share/:token', async (req, res, next) => {
    try {
      const bundle = await getSharedBundle(createUserClient(), req.params.token);
      if (!bundle) {
        res.status(404).json({ error: 'Share link not found' });
        return;
      }
      res.json({
        video: bundle.video,
        match: bundle.match ?? emptyMatch(bundle.video.id),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/share/:token/file', async (req, res, next) => {
    try {
      const bundle = await getSharedBundle(createUserClient(), req.params.token);
      if (!bundle) {
        res.status(404).json({ error: 'Share link not found' });
        return;
      }
      res.sendFile(path.join(paths.videosDir, bundle.video.filename));
    } catch (error) {
      next(error);
    }
  });

  router.put('/share/:token/match', async (req, res, next) => {
    try {
      const client = createUserClient();
      const bundle = await getSharedBundle(client, req.params.token);
      if (!bundle) {
        res.status(404).json({ error: 'Share link not found' });
        return;
      }
      const existing = bundle.match ?? emptyMatch(bundle.video.id);
      const { config, playerNames, points } = req.body ?? {};
      if (points !== undefined && !Array.isArray(points)) {
        res.status(400).json({ error: 'points must be an array' });
        return;
      }
      const match = await saveSharedMatch(client, req.params.token, {
        config: config === undefined ? existing.config : config,
        playerNames: playerNames ?? existing.playerNames,
        points: points ?? existing.points,
      });
      res.json({ match });
    } catch (error) {
      next(error);
    }
  });

  router.get('/share/:token/clips', async (req, res, next) => {
    try {
      res.json({ clips: await listSharedClips(createUserClient(), req.params.token) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/share/:token/clips', async (req, res, next) => {
    try {
      const client = createUserClient();
      const bundle = await getSharedBundle(client, req.params.token);
      if (!bundle) {
        res.status(404).json({ error: 'Share link not found' });
        return;
      }
      const { startTime, endTime, label, includeScoreboard, pointIndex } = req.body ?? {};
      if (typeof startTime !== 'number' || typeof endTime !== 'number' || endTime <= startTime) {
        res.status(400).json({ error: 'Valid startTime and endTime are required' });
        return;
      }
      const match = bundle.match;
      const id = uuidv4();
      const filename = `${id}.mp4`;
      await buildSingleClip({
        inputPath: path.join(paths.videosDir, bundle.video.filename),
        outputPath: path.join(paths.clipsDir, filename),
        startTime,
        endTime,
        includeScoreboard: Boolean(includeScoreboard),
        config: match?.config ?? null,
        names: match?.playerNames ?? { player1: 'Player 1', player2: 'Player 2' },
        points: match?.points ?? [],
        pointIndex: typeof pointIndex === 'number' ? pointIndex : 0,
      });
      const clip = await saveSharedClip(client, req.params.token, {
        id,
        videoId: bundle.video.id,
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

  router.get('/share/:token/clips/:id/file', async (req, res, next) => {
    try {
      const clip = await getSharedClip(createUserClient(), req.params.token, req.params.id);
      if (!clip) {
        res.status(404).json({ error: 'Clip not found' });
        return;
      }
      res.sendFile(path.join(paths.clipsDir, clip.filename));
    } catch (error) {
      next(error);
    }
  });

  router.delete('/share/:token/clips/:id', async (req, res, next) => {
    try {
      const deleted = await deleteSharedClip(createUserClient(), req.params.token, req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Clip not found' });
        return;
      }
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.get('/share/:token/exports', async (req, res, next) => {
    try {
      res.json({ exports: await listSharedExports(createUserClient(), req.params.token) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/share/:token/exports', async (req, res, next) => {
    try {
      const client = createUserClient();
      const bundle = await getSharedBundle(client, req.params.token);
      if (!bundle) {
        res.status(404).json({ error: 'Share link not found' });
        return;
      }
      const match = bundle.match;
      const points = Array.isArray(req.body.points) ? req.body.points : match?.points ?? [];
      const includeScoreboard = Boolean(req.body.includeScoreboard);
      const exportId = newExportId();
      const filename = `${exportId}.mp4`;
      const date = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
      const label =
        typeof req.body.label === 'string' && req.body.label.trim()
          ? req.body.label.trim()
          : `${bundle.video.name} — Highlights (${date})`;

      res.status(202).json({ exportId, message: 'Export started' });

      buildHighlight({
        exportId,
        inputPath: path.join(paths.videosDir, bundle.video.filename),
        outputPath: path.join(paths.exportsDir, filename),
        points,
        config: match?.config ?? null,
        names: match?.playerNames ?? { player1: 'Player 1', player2: 'Player 2' },
        includeScoreboard,
      })
        .then(async () => {
          await saveSharedExport(client, req.params.token, {
            id: exportId,
            videoId: bundle.video.id,
            label,
            filename,
            pointCount: points.filter((point: { winner: unknown }) => point.winner != null).length,
            includeScoreboard,
            createdAt: new Date().toISOString(),
          });
        })
        .catch((error) => {
          console.error('Shared export failed:', error);
        });
    } catch (error) {
      next(error);
    }
  });

  router.get('/share/:token/exports/:id/progress', (req, res) => {
    const progress = exportProgress[req.params.id];
    if (!progress) {
      res.status(404).json({ error: 'Export not found' });
      return;
    }
    res.json({ progress });
  });

  router.get('/share/:token/exports/:id/file', async (req, res, next) => {
    try {
      const record = await getSharedExport(createUserClient(), req.params.token, req.params.id);
      if (!record) {
        res.status(404).json({ error: 'Export not found' });
        return;
      }
      res.download(path.join(paths.exportsDir, record.filename), `${record.label}.mp4`);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/share/:token/exports/:id', async (req, res, next) => {
    try {
      const deleted = await deleteSharedExport(createUserClient(), req.params.token, req.params.id);
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
