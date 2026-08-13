import type { NextFunction, Request, Response } from 'express';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { config } from './config';

export interface AuthedRequest extends Request {
  user: User;
  supabase: SupabaseClient;
}

export function createUserClient(accessToken?: string): SupabaseClient {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  }
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function bearer(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  const query = req.query.access_token;
  if (typeof query === 'string' && query.length > 0) return query;
  return undefined;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = bearer(req);
    if (!token) {
      res.status(401).json({ error: 'Sign in required' });
      return;
    }
    const supabase = createUserClient(token);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }
    (req as AuthedRequest).user = data.user;
    (req as AuthedRequest).supabase = supabase;
    next();
  } catch (error) {
    next(error);
  }
}

export function asAuthed(req: Request): AuthedRequest {
  return req as AuthedRequest;
}
