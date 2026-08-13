import fs from 'fs/promises';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MatchConfig, Point } from '@gamesetai/scoring';
import { paths } from '../config';
import type { ClipRecord, ExportRecord, FolderRecord, MatchRecord, Store, VideoRecord } from './types';

async function unlinkQuiet(file: string): Promise<void> {
  try {
    await fs.unlink(file);
  } catch {
    // already gone
  }
}

function mapVideo(row: Record<string, unknown>): VideoRecord {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : undefined,
    name: String(row.name),
    filename: String(row.filename),
    originalFilename: String(row.original_filename),
    createdAt: String(row.created_at),
    size: Number(row.size) || 0,
    shareToken: (row.share_token as string | null) ?? null,
    folderId: (row.folder_id as string | null) ?? null,
  };
}

export function mapFolder(row: Record<string, unknown>): FolderRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    createdAt: String(row.created_at),
    parentId: (row.parent_id as string | null) ?? null,
  };
}

function mapMatch(row: Record<string, unknown>): MatchRecord {
  return {
    videoId: String(row.video_id),
    config: (row.config as MatchConfig | null) ?? null,
    playerNames: (row.player_names as MatchRecord['playerNames']) ?? {
      player1: 'Player 1',
      player2: 'Player 2',
    },
    points: (row.points as Point[]) ?? [],
    updatedAt: String(row.updated_at),
  };
}

function mapClip(row: Record<string, unknown>): ClipRecord {
  return {
    id: String(row.id),
    videoId: String(row.video_id),
    startTime: Number(row.start_time),
    endTime: Number(row.end_time),
    label: String(row.label),
    filename: String(row.filename),
    includeScoreboard: Boolean(row.include_scoreboard),
    createdAt: String(row.created_at),
  };
}

function mapExport(row: Record<string, unknown>): ExportRecord {
  return {
    id: String(row.id),
    videoId: String(row.video_id),
    label: String(row.label),
    filename: String(row.filename),
    pointCount: Number(row.point_count) || 0,
    includeScoreboard: Boolean(row.include_scoreboard),
    createdAt: String(row.created_at),
  };
}

export function createSupabaseStore(client: SupabaseClient, userId: string): Store {
  return {
    async listVideos() {
      const { data, error } = await client
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapVideo);
    },

    async getVideo(id) {
      const { data, error } = await client.from('videos').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data ? mapVideo(data) : null;
    },

    async createVideo(video) {
      const { data, error } = await client
        .from('videos')
        .insert({
          id: video.id,
          user_id: userId,
          name: video.name,
          filename: video.filename,
          original_filename: video.originalFilename,
          size: video.size,
          created_at: video.createdAt,
          folder_id: video.folderId ?? null,
        })
        .select('*')
        .single();
      if (error) throw error;
      return mapVideo(data);
    },

    async updateVideo(id, patch) {
      const update: Record<string, unknown> = {};
      if (patch.name !== undefined) update.name = patch.name;
      if (patch.folderId !== undefined) update.folder_id = patch.folderId;
      const { data, error } = await client
        .from('videos')
        .update(update)
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data ? mapVideo(data) : null;
    },

    async deleteVideo(id) {
      const existing = await this.getVideo(id);
      if (!existing) return false;
      const { error } = await client.from('videos').delete().eq('id', id);
      if (error) throw error;
      await unlinkQuiet(path.join(paths.videosDir, existing.filename));
      return true;
    },

    async getMatch(videoId) {
      const { data, error } = await client.from('matches').select('*').eq('video_id', videoId).maybeSingle();
      if (error) throw error;
      return data ? mapMatch(data) : null;
    },

    async saveMatch(match) {
      const { data, error } = await client
        .from('matches')
        .upsert({
          video_id: match.videoId,
          config: match.config,
          player_names: match.playerNames,
          points: match.points,
          updated_at: match.updatedAt,
        })
        .select('*')
        .single();
      if (error) throw error;
      return mapMatch(data);
    },

    async deleteMatch(videoId) {
      const { error } = await client.from('matches').delete().eq('video_id', videoId);
      if (error) throw error;
    },

    async listClips(videoId) {
      const { data, error } = await client
        .from('clips')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapClip);
    },

    async getClip(id) {
      const { data, error } = await client.from('clips').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data ? mapClip(data) : null;
    },

    async saveClip(clip) {
      const { data, error } = await client
        .from('clips')
        .upsert({
          id: clip.id,
          video_id: clip.videoId,
          start_time: clip.startTime,
          end_time: clip.endTime,
          label: clip.label,
          filename: clip.filename,
          include_scoreboard: clip.includeScoreboard,
          created_at: clip.createdAt,
        })
        .select('*')
        .single();
      if (error) throw error;
      return mapClip(data);
    },

    async deleteClip(id) {
      const existing = await this.getClip(id);
      if (!existing) return false;
      const { error } = await client.from('clips').delete().eq('id', id);
      if (error) throw error;
      await unlinkQuiet(path.join(paths.clipsDir, existing.filename));
      return true;
    },

    async listExports(videoId) {
      const { data, error } = await client
        .from('exports')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapExport);
    },

    async getExport(id) {
      const { data, error } = await client.from('exports').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data ? mapExport(data) : null;
    },

    async saveExport(record) {
      const { data, error } = await client
        .from('exports')
        .upsert({
          id: record.id,
          video_id: record.videoId,
          label: record.label,
          filename: record.filename,
          point_count: record.pointCount,
          include_scoreboard: record.includeScoreboard,
          created_at: record.createdAt,
        })
        .select('*')
        .single();
      if (error) throw error;
      return mapExport(data);
    },

    async deleteExport(id) {
      const existing = await this.getExport(id);
      if (!existing) return false;
      const { error } = await client.from('exports').delete().eq('id', id);
      if (error) throw error;
      await unlinkQuiet(path.join(paths.exportsDir, existing.filename));
      return true;
    },
  };
}

export async function setShareToken(
  client: SupabaseClient,
  videoId: string,
  token: string | null
): Promise<VideoRecord | null> {
  const { data, error } = await client
    .from('videos')
    .update({ share_token: token })
    .eq('id', videoId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data ? mapVideo(data) : null;
}

export async function getSharedBundle(
  client: SupabaseClient,
  token: string
): Promise<{ video: VideoRecord; match: MatchRecord | null } | null> {
  const { data, error } = await client.rpc('get_shared_video', { p_token: token });
  if (error) throw error;
  if (!data) return null;
  const payload = data as { video: Record<string, unknown>; match: Record<string, unknown> | null };
  if (!payload.video) return null;
  return {
    video: mapVideo(payload.video),
    match: payload.match ? mapMatch(payload.match) : null,
  };
}

export async function listSharedClips(client: SupabaseClient, token: string): Promise<ClipRecord[]> {
  const { data, error } = await client.rpc('list_shared_clips', { p_token: token });
  if (error) throw error;
  return Array.isArray(data) ? data.map((row) => mapClip(row as Record<string, unknown>)) : [];
}

export async function listSharedExports(client: SupabaseClient, token: string): Promise<ExportRecord[]> {
  const { data, error } = await client.rpc('list_shared_exports', { p_token: token });
  if (error) throw error;
  return Array.isArray(data) ? data.map((row) => mapExport(row as Record<string, unknown>)) : [];
}

export async function saveSharedClip(client: SupabaseClient, token: string, clip: ClipRecord): Promise<ClipRecord> {
  const { data, error } = await client.rpc('save_shared_clip', {
    p_token: token,
    p_id: clip.id,
    p_start: clip.startTime,
    p_end: clip.endTime,
    p_label: clip.label,
    p_filename: clip.filename,
    p_include_scoreboard: clip.includeScoreboard,
    p_created_at: clip.createdAt,
  });
  if (error) throw error;
  return mapClip(data as Record<string, unknown>);
}

export async function saveSharedExport(
  client: SupabaseClient,
  token: string,
  record: ExportRecord
): Promise<ExportRecord> {
  const { data, error } = await client.rpc('save_shared_export', {
    p_token: token,
    p_id: record.id,
    p_label: record.label,
    p_filename: record.filename,
    p_point_count: record.pointCount,
    p_include_scoreboard: record.includeScoreboard,
    p_created_at: record.createdAt,
  });
  if (error) throw error;
  return mapExport(data as Record<string, unknown>);
}

export async function getSharedClip(
  client: SupabaseClient,
  token: string,
  id: string
): Promise<ClipRecord | null> {
  const { data, error } = await client.rpc('get_shared_clip', { p_token: token, p_id: id });
  if (error) throw error;
  return data ? mapClip(data as Record<string, unknown>) : null;
}

export async function getSharedExport(
  client: SupabaseClient,
  token: string,
  id: string
): Promise<ExportRecord | null> {
  const { data, error } = await client.rpc('get_shared_export', { p_token: token, p_id: id });
  if (error) throw error;
  return data ? mapExport(data as Record<string, unknown>) : null;
}

export async function deleteSharedClip(client: SupabaseClient, token: string, id: string): Promise<boolean> {
  const existing = await getSharedClip(client, token, id);
  const { data, error } = await client.rpc('delete_shared_clip', { p_token: token, p_id: id });
  if (error) throw error;
  if (existing) await unlinkQuiet(path.join(paths.clipsDir, existing.filename));
  return Boolean(data);
}

export async function deleteSharedExport(client: SupabaseClient, token: string, id: string): Promise<boolean> {
  const existing = await getSharedExport(client, token, id);
  const { data, error } = await client.rpc('delete_shared_export', { p_token: token, p_id: id });
  if (error) throw error;
  if (existing) await unlinkQuiet(path.join(paths.exportsDir, existing.filename));
  return Boolean(data);
}

export async function saveSharedMatch(
  client: SupabaseClient,
  token: string,
  match: { config: MatchConfig | null; playerNames: MatchRecord['playerNames']; points: Point[] }
): Promise<MatchRecord> {
  const { data, error } = await client.rpc('save_shared_match', {
    p_token: token,
    p_config: match.config,
    p_player_names: match.playerNames,
    p_points: match.points,
  });
  if (error) throw error;
  return mapMatch(data as Record<string, unknown>);
}
