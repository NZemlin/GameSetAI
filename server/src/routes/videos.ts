import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { asAuthed, requireAuth } from '../auth';
import { paths } from '../config';
import { createSupabaseStore, setShareToken } from '../storage/supabase';

const ALLOWED = new Set(['.mp4', '.mov', '.avi', '.webm']);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, paths.videosDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED.has(ext) || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (mp4, mov, avi, webm).'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 * 1024 },
});

export function videosRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/videos', async (req, res, next) => {
    try {
      const { supabase, user } = asAuthed(req);
      res.json({ videos: await createSupabaseStore(supabase, user.id).listVideos() });
    } catch (error) {
      next(error);
    }
  });

  router.get('/videos/:id', async (req, res, next) => {
    try {
      const { supabase, user } = asAuthed(req);
      const video = await createSupabaseStore(supabase, user.id).getVideo(req.params.id);
      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }
      res.json({ video });
    } catch (error) {
      next(error);
    }
  });

  router.get('/videos/:id/file', async (req, res, next) => {
    try {
      const { supabase, user } = asAuthed(req);
      const video = await createSupabaseStore(supabase, user.id).getVideo(req.params.id);
      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }
      res.sendFile(path.join(paths.videosDir, video.filename));
    } catch (error) {
      next(error);
    }
  });

  router.post('/videos', upload.single('video'), async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      const { supabase, user } = asAuthed(req);
      const id = path.parse(req.file.filename).name;
      const name =
        (typeof req.body.name === 'string' && req.body.name.trim()) ||
        path.parse(req.file.originalname).name;
      const folderId =
        typeof req.body.folderId === 'string' && req.body.folderId.trim() ? req.body.folderId.trim() : null;
      const video = await createSupabaseStore(supabase, user.id).createVideo({
        id,
        name,
        filename: req.file.filename,
        originalFilename: req.file.originalname,
        createdAt: new Date().toISOString(),
        size: req.file.size,
        folderId,
      });
      res.status(201).json({ video });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/videos/:id', async (req, res, next) => {
    try {
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : undefined;
      const folderId =
        req.body.folderId === null
          ? null
          : typeof req.body.folderId === 'string'
            ? req.body.folderId
            : undefined;
      if (!name && folderId === undefined) {
        res.status(400).json({ error: 'Nothing to update' });
        return;
      }
      const { supabase, user } = asAuthed(req);
      const video = await createSupabaseStore(supabase, user.id).updateVideo(req.params.id, {
        ...(name ? { name } : {}),
        ...(folderId !== undefined ? { folderId } : {}),
      });
      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }
      res.json({ video });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/videos/:id', async (req, res, next) => {
    try {
      const { supabase, user } = asAuthed(req);
      const deleted = await createSupabaseStore(supabase, user.id).deleteVideo(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  router.post('/videos/:id/share', async (req, res, next) => {
    try {
      const { supabase, user } = asAuthed(req);
      const store = createSupabaseStore(supabase, user.id);
      const video = await store.getVideo(req.params.id);
      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }
      const token = video.shareToken || uuidv4();
      const updated = await setShareToken(supabase, req.params.id, token);
      res.json({ video: updated, shareUrl: `/m/${token}` });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/videos/:id/share', async (req, res, next) => {
    try {
      const { supabase, user } = asAuthed(req);
      const video = await createSupabaseStore(supabase, user.id).getVideo(req.params.id);
      if (!video) {
        res.status(404).json({ error: 'Video not found' });
        return;
      }
      const updated = await setShareToken(supabase, req.params.id, null);
      res.json({ video: updated });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
