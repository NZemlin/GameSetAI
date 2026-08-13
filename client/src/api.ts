import type { MatchConfig, Point } from '@gamesetai/scoring';
import { supabase } from './lib/supabase';

const base = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const auth = await authHeaders();
  Object.entries(auth).forEach(([key, value]) => headers.set(key, value));
  const response = await fetch(`${base}${path}`, { ...init, headers });
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      message = body.error || body.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface Video {
  id: string;
  name: string;
  filename: string;
  originalFilename: string;
  createdAt: string;
  size: number;
  shareToken?: string | null;
  folderId?: string | null;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
  parentId?: string | null;
}

export interface MatchData {
  videoId: string;
  config: MatchConfig | null;
  playerNames: { player1: string; player2: string };
  points: Point[];
  updatedAt: string;
}

export interface Clip {
  id: string;
  videoId: string;
  startTime: number;
  endTime: number;
  label: string;
  filename: string;
  includeScoreboard: boolean;
  createdAt: string;
}

export interface ExportItem {
  id: string;
  videoId: string;
  label: string;
  filename: string;
  pointCount: number;
  includeScoreboard: boolean;
  createdAt: string;
}

export type AccountRole = 'individual' | 'club';

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  role: AccountRole;
}

export interface ExportProgress {
  active: boolean;
  completed: boolean;
  error?: string;
  total: number;
  current: number;
  message: string;
}

export const api = {
  health: () => request<{ ok: boolean; ffmpeg: boolean }>('/api/health'),
  me: () => request<{ profile: Profile }>('/api/me'),
  updateMe: (patch: Partial<Pick<Profile, 'displayName' | 'role'>>) =>
    request<{ profile: Profile }>('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  listFolders: () => request<{ folders: Folder[] }>('/api/folders'),
  createFolder: (name: string, parentId?: string | null) =>
    request<{ folder: Folder }>('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentId: parentId || null }),
    }),
  renameFolder: (id: string, name: string) =>
    request<{ folder: Folder }>(`/api/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
  moveFolder: (id: string, parentId: string | null) =>
    request<{ folder: Folder }>(`/api/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parentId }),
    }),
  deleteFolder: (id: string) => request<{ ok: boolean }>(`/api/folders/${id}`, { method: 'DELETE' }),
  listVideos: () => request<{ videos: Video[] }>('/api/videos'),
  getVideo: (id: string) => request<{ video: Video }>(`/api/videos/${id}`),
  videoFileUrl: (id: string, token?: string) =>
    `${base}/api/videos/${id}/file${token ? `?access_token=${encodeURIComponent(token)}` : ''}`,
  clipFileUrl: (id: string, token?: string) =>
    `${base}/api/clips/${id}/file${token ? `?access_token=${encodeURIComponent(token)}` : ''}`,
  exportFileUrl: (id: string, token?: string) =>
    `${base}/api/exports/${id}/file${token ? `?access_token=${encodeURIComponent(token)}` : ''}`,
  moveVideo: (id: string, folderId: string | null) =>
    request<{ video: Video }>(`/api/videos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId }),
    }),
  uploadVideo: async (file: File, name: string, onProgress?: (pct: number) => void, folderId?: string | null) => {
    const form = new FormData();
    form.append('video', file);
    form.append('name', name);
    if (folderId) form.append('folderId', folderId);
    return new Promise<{ video: Video }>((resolve, reject) => {
      void (async () => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${base}/api/videos`);
      const auth = await authHeaders();
      Object.entries(auth).forEach(([key, value]) => xhr.setRequestHeader(key, value));
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          try {
            reject(new Error(JSON.parse(xhr.responseText).error));
          } catch {
            reject(new Error('Upload failed'));
          }
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.send(form);
      })();
    });
  },
  enableShare: (id: string) =>
    request<{ video: Video; shareUrl: string }>(`/api/videos/${id}/share`, { method: 'POST' }),
  disableShare: (id: string) => request<{ video: Video }>(`/api/videos/${id}/share`, { method: 'DELETE' }),
  getShare: (token: string) => request<{ video: Video; match: MatchData }>(`/api/share/${token}`),
  saveShareMatch: (token: string, match: Partial<Pick<MatchData, 'config' | 'playerNames' | 'points'>>) =>
    request<{ match: MatchData }>(`/api/share/${token}/match`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(match),
    }),
  shareFileUrl: (token: string) => `${base}/api/share/${token}/file`,
  listShareClips: (token: string) => request<{ clips: Clip[] }>(`/api/share/${token}/clips`),
  createShareClip: (
    token: string,
    body: { startTime: number; endTime: number; label?: string; includeScoreboard?: boolean; pointIndex?: number }
  ) =>
    request<{ clip: Clip }>(`/api/share/${token}/clips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  shareClipFileUrl: (token: string, id: string) => `${base}/api/share/${token}/clips/${id}/file`,
  deleteShareClip: (token: string, id: string) =>
    request<{ ok: boolean }>(`/api/share/${token}/clips/${id}`, { method: 'DELETE' }),
  listShareExports: (token: string) => request<{ exports: ExportItem[] }>(`/api/share/${token}/exports`),
  startShareExport: (token: string, body: { points?: Point[]; includeScoreboard?: boolean; label?: string }) =>
    request<{ exportId: string }>(`/api/share/${token}/exports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  shareExportProgress: (token: string, id: string) =>
    request<{ progress: ExportProgress }>(`/api/share/${token}/exports/${id}/progress`),
  shareExportFileUrl: (token: string, id: string) => `${base}/api/share/${token}/exports/${id}/file`,
  deleteShareExport: (token: string, id: string) =>
    request<{ ok: boolean }>(`/api/share/${token}/exports/${id}`, { method: 'DELETE' }),
  renameVideo: (id: string, name: string) =>
    request<{ video: Video }>(`/api/videos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
  deleteVideo: (id: string) => request<{ ok: boolean }>(`/api/videos/${id}`, { method: 'DELETE' }),
  getMatch: (id: string) => request<{ match: MatchData }>(`/api/videos/${id}/match`),
  saveMatch: (id: string, match: Partial<Pick<MatchData, 'config' | 'playerNames' | 'points'>>) =>
    request<{ match: MatchData }>(`/api/videos/${id}/match`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(match),
    }),
  resetMatch: (id: string) =>
    request<{ match: MatchData }>(`/api/videos/${id}/match/reset`, { method: 'POST' }),
  listClips: (videoId: string) => request<{ clips: Clip[] }>(`/api/videos/${videoId}/clips`),
  createClip: (
    videoId: string,
    body: { startTime: number; endTime: number; label?: string; includeScoreboard?: boolean; pointIndex?: number }
  ) =>
    request<{ clip: Clip }>(`/api/videos/${videoId}/clips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  renameClip: (id: string, label: string) =>
    request<{ clip: Clip }>(`/api/clips/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    }),
  deleteClip: (id: string) => request<{ ok: boolean }>(`/api/clips/${id}`, { method: 'DELETE' }),
  listExports: (videoId: string) => request<{ exports: ExportItem[] }>(`/api/videos/${videoId}/exports`),
  startExport: (videoId: string, body: { points?: Point[]; includeScoreboard?: boolean; label?: string }) =>
    request<{ exportId: string }>(`/api/videos/${videoId}/exports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  exportProgress: (id: string) => request<{ progress: ExportProgress }>(`/api/exports/${id}/progress`),
  renameExport: (id: string, label: string) =>
    request<{ export: ExportItem }>(`/api/exports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    }),
  deleteExport: (id: string) => request<{ ok: boolean }>(`/api/exports/${id}`, { method: 'DELETE' }),
};
