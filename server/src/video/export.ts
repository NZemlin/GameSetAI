import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { replay, type MatchConfig, type Point } from '@gamesetai/scoring';
import type { ExportProgress } from '../storage/types';
import { ffmpegAvailable, runFfmpeg } from './ffmpeg';
import { renderScoreboardPng } from './scoreboard';

const POST_ROLL = 5;
const CONCURRENCY = 2;

export const exportProgress: Record<string, ExportProgress> = {};

function setProgress(id: string, patch: Partial<ExportProgress>): void {
  exportProgress[id] = { ...exportProgress[id], ...patch };
}

async function extractClip(
  input: string,
  output: string,
  start: number,
  duration: number,
  overlay?: string
): Promise<void> {
  const args = ['-y', '-ss', start.toFixed(3), '-i', input];
  if (overlay) {
    args.push(
      '-i',
      overlay,
      '-filter_complex',
      '[0:v][1:v]overlay=16:main_h-overlay_h-16',
      '-t',
      duration.toFixed(3),
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-ar',
      '48000',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      output
    );
  } else {
    args.push(
      '-t',
      duration.toFixed(3),
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-ar',
      '48000',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      output
    );
  }
  await runFfmpeg(args);
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export async function buildHighlight(options: {
  exportId: string;
  inputPath: string;
  outputPath: string;
  points: Point[];
  config: MatchConfig | null;
  names: { player1: string; player2: string };
  includeScoreboard: boolean;
}): Promise<void> {
  const { exportId, inputPath, outputPath, points, config, names, includeScoreboard } = options;
  const valid = points.filter(
    (point) =>
      point.winner !== null &&
      Number.isFinite(point.startTime) &&
      Number.isFinite(point.endTime) &&
      point.endTime > point.startTime
  );

  exportProgress[exportId] = {
    active: true,
    completed: false,
    total: valid.length,
    current: 0,
    message: 'Preparing export…',
  };

  if (!(await ffmpegAvailable())) {
    setProgress(exportId, {
      active: false,
      completed: false,
      error: 'FFmpeg is not installed. Install FFmpeg and restart the server.',
    });
    throw new Error('FFmpeg is not installed');
  }

  if (valid.length === 0) {
    setProgress(exportId, {
      active: false,
      completed: false,
      error: 'No valid scored points to export',
    });
    throw new Error('No valid scored points to export');
  }

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'gamesetai-'));
  const piecePaths: string[] = [];

  try {
    await mapPool(valid, CONCURRENCY, async (point, index) => {
      const mainPath = path.join(tmp, `p${index}-main.mp4`);
      const postPath = path.join(tmp, `p${index}-post.mp4`);
      let overlayBefore: string | undefined;
      let overlayAfter: string | undefined;

      if (includeScoreboard && config) {
        const before = replay(config, valid.slice(0, index)).score;
        const after = replay(config, valid.slice(0, index + 1)).score;
        overlayBefore = path.join(tmp, `p${index}-before.png`);
        overlayAfter = path.join(tmp, `p${index}-after.png`);
        await fs.writeFile(overlayBefore, await renderScoreboardPng(before, config, names));
        await fs.writeFile(overlayAfter, await renderScoreboardPng(after, config, names));
      }

      await extractClip(inputPath, mainPath, point.startTime, point.endTime - point.startTime, overlayBefore);
      await extractClip(inputPath, postPath, point.endTime, POST_ROLL, overlayAfter);
      piecePaths[index * 2] = mainPath;
      piecePaths[index * 2 + 1] = postPath;
      setProgress(exportId, {
        current: index + 1,
        message: `Processed point ${index + 1} of ${valid.length}`,
      });
    });

    setProgress(exportId, { message: 'Concatenating…' });
    const listPath = path.join(tmp, 'list.txt');
    const list = piecePaths
      .filter(Boolean)
      .map((file) => `file '${file.replace(/\\/g, '/')}'`)
      .join('\n');
    await fs.writeFile(listPath, list, 'utf8');
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await runFfmpeg([
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      listPath,
      '-c',
      'copy',
      outputPath,
    ]);

    setProgress(exportId, {
      active: false,
      completed: true,
      current: valid.length,
      message: 'Done',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed';
    setProgress(exportId, { active: false, completed: false, error: message });
    throw error;
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

export async function buildSingleClip(options: {
  inputPath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
  includeScoreboard: boolean;
  config: MatchConfig | null;
  names: { player1: string; player2: string };
  points: Point[];
  pointIndex: number;
}): Promise<void> {
  if (!(await ffmpegAvailable())) {
    throw new Error('FFmpeg is not installed');
  }
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'gamesetai-clip-'));
  try {
    let overlayBefore: string | undefined;
    let overlayAfter: string | undefined;
    if (options.includeScoreboard && options.config) {
      const scored = options.points.filter((point) => point.winner !== null);
      const index = Math.max(0, options.pointIndex);
      const before = replay(options.config, scored.slice(0, index)).score;
      const after = replay(options.config, scored.slice(0, index + 1)).score;
      overlayBefore = path.join(tmp, 'before.png');
      overlayAfter = path.join(tmp, 'after.png');
      await fs.writeFile(overlayBefore, await renderScoreboardPng(before, options.config, options.names));
      await fs.writeFile(overlayAfter, await renderScoreboardPng(after, options.config, options.names));
    }
    const mainPath = path.join(tmp, 'main.mp4');
    const postPath = path.join(tmp, 'post.mp4');
    await extractClip(
      options.inputPath,
      mainPath,
      options.startTime,
      options.endTime - options.startTime,
      overlayBefore
    );
    await extractClip(options.inputPath, postPath, options.endTime, POST_ROLL, overlayAfter);
    const listPath = path.join(tmp, 'list.txt');
    await fs.writeFile(
      listPath,
      `file '${mainPath.replace(/\\/g, '/')}'\nfile '${postPath.replace(/\\/g, '/')}'`,
      'utf8'
    );
    await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
    await runFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', options.outputPath]);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

export function newExportId(): string {
  return uuidv4();
}
