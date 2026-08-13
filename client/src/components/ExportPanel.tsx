import { useEffect, useState } from 'react';
import type { Point } from '@gamesetai/scoring';
import { useAuth } from '../auth/AuthContext';
import { api, type Clip, type ExportItem, type ExportProgress } from '../api';
import { formatClock } from '../lib/time';

interface Props {
  videoId: string;
  videoName: string;
  points: Point[];
  shareToken?: string;
}

export default function ExportPanel({ videoId, videoName, points, shareToken }: Props) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [exports, setExports] = useState<ExportItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [scoreboard, setScoreboard] = useState(true);
  const [ffmpeg, setFfmpeg] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const { session } = useAuth();
  const token = session?.access_token;

  const refresh = async () => {
    const [clipRes, exportRes] = shareToken
      ? await Promise.all([api.listShareClips(shareToken), api.listShareExports(shareToken)])
      : await Promise.all([api.listClips(videoId), api.listExports(videoId)]);
    setClips(clipRes.clips);
    setExports(exportRes.exports);
  };

  useEffect(() => {
    void api.health().then((h) => setFfmpeg(h.ffmpeg));
    void refresh();
  }, [videoId, shareToken]);

  const scored = points.filter((point) => point.winner !== null);

  const toggle = (index: number) => {
    setSelected((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
  };

  const makeClip = async (point: Point, index: number) => {
    setBusy(true);
    setError('');
    try {
      const body = {
        startTime: point.startTime,
        endTime: point.endTime,
        includeScoreboard: scoreboard,
        pointIndex: index,
        label: `Point ${index + 1}`,
      };
      if (shareToken) await api.createShareClip(shareToken, body);
      else await api.createClip(videoId, body);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clip failed');
    } finally {
      setBusy(false);
    }
  };

  const exportSelected = async () => {
    const chosen = selected.map((index) => scored[index]).filter(Boolean);
    if (chosen.length === 0) {
      setError('Select at least one point.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = {
        points: chosen,
        includeScoreboard: scoreboard,
        label: `${videoName} — Highlights`,
      };
      const { exportId } = shareToken
        ? await api.startShareExport(shareToken, payload)
        : await api.startExport(videoId, payload);
      const poll = async () => {
        const { progress: next } = shareToken
          ? await api.shareExportProgress(shareToken, exportId)
          : await api.exportProgress(exportId);
        setProgress(next);
        if (next.active) {
          window.setTimeout(() => void poll(), 800);
          return;
        }
        setBusy(false);
        if (next.error) setError(next.error);
        await refresh();
      };
      void poll();
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  return (
    <div className="space-y-4">
      {ffmpeg === false && (
        <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          FFmpeg is not available. Install it and restart the server to create clips.
        </p>
      )}
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={scoreboard} onChange={(e) => setScoreboard(e.target.checked)} />
        Burn in scoreboard
      </label>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Points to export</h3>
          <button
            type="button"
            onClick={() => setSelected(scored.map((_, i) => i))}
            className="text-xs text-indigo-600"
          >
            Select all
          </button>
        </div>
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {scored.map((point, index) => (
            <li key={index}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(index)}
                  onChange={() => toggle(index)}
                />
                <span>
                  {index + 1} · {formatClock(point.startTime)}–{formatClock(point.endTime)}
                </span>
                <button
                  type="button"
                  disabled={busy || ffmpeg === false}
                  onClick={() => void makeClip(point, index)}
                  className="ml-auto text-xs text-indigo-600 disabled:text-gray-400"
                >
                  Clip
                </button>
              </label>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={busy || ffmpeg === false}
          onClick={() => void exportSelected()}
          className="mt-3 w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:bg-indigo-300"
        >
          {busy ? 'Working…' : 'Export selected'}
        </button>
        {progress && (
          <p className="mt-2 text-xs text-gray-500">
            {progress.message}
            {progress.total > 0 && ` (${progress.current}/${progress.total})`}
          </p>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div>
        <h3 className="text-sm font-semibold">Clips</h3>
        {clips.length === 0 ? (
          <p className="text-xs text-gray-500">None yet.</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {clips.map((clip) => (
              <li key={clip.id} className="flex items-center justify-between text-sm">
                <a
                  href={shareToken ? api.shareClipFileUrl(shareToken, clip.id) : api.clipFileUrl(clip.id, token)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600"
                >
                  {clip.label}
                </a>
                <button
                  type="button"
                  onClick={() =>
                    void (shareToken ? api.deleteShareClip(shareToken, clip.id) : api.deleteClip(clip.id)).then(refresh)
                  }
                  className="text-red-400"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold">Exports</h3>
        {exports.length === 0 ? (
          <p className="text-xs text-gray-500">None yet.</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {exports.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-sm">
                <a
                  href={shareToken ? api.shareExportFileUrl(shareToken, item.id) : api.exportFileUrl(item.id, token)}
                  className="text-indigo-600"
                >
                  {item.label}
                </a>
                <button
                  type="button"
                  onClick={() =>
                    void (shareToken ? api.deleteShareExport(shareToken, item.id) : api.deleteExport(item.id)).then(
                      refresh
                    )
                  }
                  className="text-red-400"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
