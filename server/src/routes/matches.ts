import { Router } from 'express';
import type { MatchConfig, Point } from '@gamesetai/scoring';
import { asAuthed, requireAuth } from '../auth';
import { createSupabaseStore } from '../storage/supabase';

function emptyMatch(videoId: string) {
  return {
    videoId,
    config: null as MatchConfig | null,
    playerNames: { player1: 'Player 1', player2: 'Player 2' },
    points: [] as Point[],
    updatedAt: new Date().toISOString(),
  };
}

export function matchesRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/videos/:id/match', async (req, res, next) => {
    try {
      const { supabase, user } = asAuthed(req);
      const store = createSupabaseStore(supabase, user.id);
      const video = await store.getVideo(req.params.id);
      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }
      res.json({ match: (await store.getMatch(req.params.id)) ?? emptyMatch(req.params.id) });
    } catch (error) {
      next(error);
    }
  });

  router.put('/videos/:id/match', async (req, res, next) => {
    try {
      const { supabase, user } = asAuthed(req);
      const store = createSupabaseStore(supabase, user.id);
      const video = await store.getVideo(req.params.id);
      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }
      const { config, playerNames, points } = req.body ?? {};
      if (points !== undefined && !Array.isArray(points)) {
        res.status(400).json({ error: 'points must be an array' });
        return;
      }
      const existing = (await store.getMatch(req.params.id)) ?? emptyMatch(req.params.id);
      const match = await store.saveMatch({
        videoId: req.params.id,
        config: config === undefined ? existing.config : config,
        playerNames: playerNames ?? existing.playerNames,
        points: points ?? existing.points,
        updatedAt: new Date().toISOString(),
      });
      res.json({ match });
    } catch (error) {
      next(error);
    }
  });

  router.post('/videos/:id/match/reset', async (req, res, next) => {
    try {
      const { supabase, user } = asAuthed(req);
      const store = createSupabaseStore(supabase, user.id);
      const video = await store.getVideo(req.params.id);
      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }
      res.json({ match: await store.saveMatch(emptyMatch(req.params.id)) });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
