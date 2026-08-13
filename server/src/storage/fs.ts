import fs from 'fs/promises';
import path from 'path';
import { paths } from '../config';
import type {
  ClipRecord,
  ExportRecord,
  MatchRecord,
  Store,
  VideoRecord,
} from './types';

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, JSON.stringify(value, null, 2), 'utf8');
}

async function unlinkQuiet(file: string): Promise<void> {
  try {
    await fs.unlink(file);
  } catch {
    // already gone
  }
}

export async function initStore(): Promise<void> {
  await Promise.all([
    ensureDir(paths.videosDir),
    ensureDir(paths.matchesDir),
    ensureDir(paths.clipsDir),
    ensureDir(paths.exportsDir),
  ]);
}

export function createFsStore(): Store {
  const readVideos = () => readJson<Record<string, VideoRecord>>(paths.videosIndex, {});
  const writeVideos = (all: Record<string, VideoRecord>) => writeJson(paths.videosIndex, all);
  const readClips = () => readJson<Record<string, ClipRecord>>(paths.clipsIndex, {});
  const writeClips = (all: Record<string, ClipRecord>) => writeJson(paths.clipsIndex, all);
  const readExports = () => readJson<Record<string, ExportRecord>>(paths.exportsIndex, {});
  const writeExports = (all: Record<string, ExportRecord>) => writeJson(paths.exportsIndex, all);
  const matchPath = (videoId: string) => path.join(paths.matchesDir, `${videoId}.json`);

  return {
    async listVideos() {
      const all = await readVideos();
      return Object.values(all).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async getVideo(id) {
      const all = await readVideos();
      return all[id] ?? null;
    },

    async createVideo(video) {
      const all = await readVideos();
      all[video.id] = video;
      await writeVideos(all);
      return video;
    },

    async updateVideo(id, patch) {
      const all = await readVideos();
      if (!all[id]) return null;
      all[id] = { ...all[id], ...patch };
      await writeVideos(all);
      return all[id];
    },

    async deleteVideo(id) {
      const all = await readVideos();
      const video = all[id];
      if (!video) return false;
      delete all[id];
      await writeVideos(all);
      await unlinkQuiet(path.join(paths.videosDir, video.filename));
      await this.deleteMatch(id);

      const clips = await readClips();
      for (const [clipId, clip] of Object.entries(clips)) {
        if (clip.videoId === id) {
          delete clips[clipId];
          await unlinkQuiet(path.join(paths.clipsDir, clip.filename));
        }
      }
      await writeClips(clips);

      const exports = await readExports();
      for (const [exportId, record] of Object.entries(exports)) {
        if (record.videoId === id) {
          delete exports[exportId];
          await unlinkQuiet(path.join(paths.exportsDir, record.filename));
        }
      }
      await writeExports(exports);
      return true;
    },

    async getMatch(videoId) {
      return readJson<MatchRecord | null>(matchPath(videoId), null);
    },

    async saveMatch(match) {
      await writeJson(matchPath(match.videoId), match);
      return match;
    },

    async deleteMatch(videoId) {
      await unlinkQuiet(matchPath(videoId));
    },

    async listClips(videoId) {
      const all = await readClips();
      return Object.values(all)
        .filter((clip) => clip.videoId === videoId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async getClip(id) {
      const all = await readClips();
      return all[id] ?? null;
    },

    async saveClip(clip) {
      const all = await readClips();
      all[clip.id] = clip;
      await writeClips(all);
      return clip;
    },

    async deleteClip(id) {
      const all = await readClips();
      const clip = all[id];
      if (!clip) return false;
      delete all[id];
      await writeClips(all);
      await unlinkQuiet(path.join(paths.clipsDir, clip.filename));
      return true;
    },

    async listExports(videoId) {
      const all = await readExports();
      return Object.values(all)
        .filter((record) => record.videoId === videoId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async getExport(id) {
      const all = await readExports();
      return all[id] ?? null;
    },

    async saveExport(record) {
      const all = await readExports();
      all[record.id] = record;
      await writeExports(all);
      return record;
    },

    async deleteExport(id) {
      const all = await readExports();
      const record = all[id];
      if (!record) return false;
      delete all[id];
      await writeExports(all);
      await unlinkQuiet(path.join(paths.exportsDir, record.filename));
      return true;
    },
  };
}
