import { Router } from 'express';
import { asAuthed, requireAuth } from '../auth';
import { createSupabaseStore, mapFolder } from '../storage/supabase';

function descendantFolderIds(
  folders: Array<{ id: string; parentId?: string | null }>,
  rootId: string
): string[] {
  const ids = [rootId];
  folders
    .filter((folder) => folder.parentId === rootId)
    .forEach((child) => ids.push(...descendantFolderIds(folders, child.id)));
  return ids;
}

export function foldersRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/folders', async (req, res, next) => {
    try {
      const { supabase } = asAuthed(req);
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.json({ folders: (data ?? []).map(mapFolder) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/folders', async (req, res, next) => {
    try {
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
      if (!name) {
        res.status(400).json({ error: 'Name is required' });
        return;
      }
      const parentId =
        typeof req.body.parentId === 'string' && req.body.parentId.trim() ? req.body.parentId.trim() : null;
      const { supabase, user } = asAuthed(req);
      const { data, error } = await supabase
        .from('folders')
        .insert({ user_id: user.id, name, parent_id: parentId })
        .select('*')
        .single();
      if (error) throw error;
      res.status(201).json({ folder: mapFolder(data) });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/folders/:id', async (req, res, next) => {
    try {
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : undefined;
      const parentId =
        req.body.parentId === null
          ? null
          : typeof req.body.parentId === 'string'
            ? req.body.parentId
            : undefined;
      if (!name && parentId === undefined) {
        res.status(400).json({ error: 'Nothing to update' });
        return;
      }
      const { supabase } = asAuthed(req);
      const update: Record<string, unknown> = {};
      if (name) update.name = name;
      if (parentId !== undefined) update.parent_id = parentId;
      const { data, error } = await supabase
        .from('folders')
        .update(update)
        .eq('id', req.params.id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        res.status(404).json({ error: 'Folder not found' });
        return;
      }
      res.json({ folder: mapFolder(data) });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/folders/:id', async (req, res, next) => {
    try {
      const { supabase, user } = asAuthed(req);
      const { data: allRows, error: listError } = await supabase.from('folders').select('*');
      if (listError) throw listError;
      const allFolders = (allRows ?? []).map(mapFolder);
      if (!allFolders.some((folder) => folder.id === req.params.id)) {
        res.status(404).json({ error: 'Folder not found' });
        return;
      }
      const folderIds = descendantFolderIds(allFolders, req.params.id);
      const store = createSupabaseStore(supabase, user.id);
      const videos = await store.listVideos();
      for (const video of videos.filter((item) => item.folderId && folderIds.includes(item.folderId))) {
        await store.deleteVideo(video.id);
      }
      const { error } = await supabase.from('folders').delete().in('id', folderIds);
      if (error) throw error;
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
