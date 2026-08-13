import { Router } from 'express';
import { asAuthed, requireAuth } from '../auth';

export type AccountRole = 'individual' | 'club';

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  role: AccountRole;
}

export function profileRouter(): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/me', async (req, res, next) => {
    try {
      const { supabase, user } = asAuthed(req);
      let { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) throw error;
      if (!data) {
        const inserted = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            display_name: user.email?.split('@')[0] || 'Player',
            role: 'individual',
          })
          .select('*')
          .single();
        if (inserted.error) throw inserted.error;
        data = inserted.data;
      }
      const profile: Profile = {
        id: user.id,
        email: user.email || data?.email || '',
        displayName: data?.display_name || user.email?.split('@')[0] || 'Player',
        role: data?.role === 'club' ? 'club' : 'individual',
      };
      res.json({ profile });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/me', async (req, res, next) => {
    try {
      const { supabase, user } = asAuthed(req);
      const displayName =
        typeof req.body.displayName === 'string' ? req.body.displayName.trim() : undefined;
      const role: AccountRole | undefined =
        req.body.role === 'club' || req.body.role === 'individual' ? req.body.role : undefined;
      const patch: Record<string, string> = {};
      if (displayName) patch.display_name = displayName;
      if (role) patch.role = role;
      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', user.id)
        .select('*')
        .single();
      if (error) throw error;
      res.json({
        profile: {
          id: user.id,
          email: user.email || data.email || '',
          displayName: data.display_name,
          role: data.role === 'club' ? 'club' : 'individual',
        } satisfies Profile,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
