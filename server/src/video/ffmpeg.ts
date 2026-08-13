import { execFile } from 'child_process';
import { promisify } from 'util';
import { config } from '../config';

const execFileAsync = promisify(execFile);

export async function ffmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync(config.ffmpegPath, ['-version'], { windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

export async function runFfmpeg(args: string[]): Promise<void> {
  await execFileAsync(config.ffmpegPath, args, {
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024,
  });
}

export async function probeDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync(
      config.ffmpegPath.replace(/ffmpeg(\.exe)?$/i, (m) => m.replace(/ffmpeg/i, 'ffprobe')),
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', filePath],
      { windowsHide: true }
    );
    const value = Number.parseFloat(stdout.trim());
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}
