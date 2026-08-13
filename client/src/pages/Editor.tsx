import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  isTimeInPoint,
  pointOverlapsExisting,
  replay,
  replayUpTo,
  type MatchConfig,
  type PlayerId,
  type Point,
} from '@gamesetai/scoring';
import { useAuth } from '../auth/AuthContext';
import { api, type Video } from '../api';
import ExportPanel from '../components/ExportPanel';
import MatchSetup from '../components/MatchSetup';
import PointsList from '../components/PointsList';
import ScorePanel from '../components/ScorePanel';
import Timeline from '../components/Timeline';

export default function Editor({ share = false }: { share?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const { token: shareToken } = useParams<{ token: string }>();
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const videoEl = useRef<HTMLVideoElement | null>(null);
  const [videoNode, setVideoNode] = useState<HTMLVideoElement | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [name, setName] = useState('');
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [names, setNames] = useState({ player1: 'Player 1', player2: 'Player 2' });
  const [points, setPoints] = useState<Point[]>([]);
  const [currentStart, setCurrentStart] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [tab, setTab] = useState<'score' | 'export'>('score');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const saveTimer = useRef<number | null>(null);

  const attachVideo = useCallback((node: HTMLVideoElement | null) => {
    videoEl.current = node;
    setVideoNode(node);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (share && shareToken) {
          const { video: nextVideo, match } = await api.getShare(shareToken);
          if (cancelled) return;
          setVideo(nextVideo);
          setName(nextVideo.name);
          setConfig(match.config);
          setNames(match.playerNames);
          setPoints(match.points);
          setLastSaved(match.updatedAt);
          return;
        }
        if (!id) return;
        const [{ video: nextVideo }, { match }] = await Promise.all([api.getVideo(id), api.getMatch(id)]);
        if (cancelled) return;
        setVideo(nextVideo);
        setName(nextVideo.name);
        setConfig(match.config);
        setNames(match.playerNames);
        setPoints(match.points);
        setLastSaved(match.updatedAt);
        if (nextVideo.shareToken) setShareUrl(`${window.location.origin}/m/${nextVideo.shareToken}`);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, share, shareToken]);

  const persist = useCallback(
    (next: { config?: MatchConfig | null; playerNames?: typeof names; points?: Point[] }) => {
      if (!id && !shareToken) return;
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        setSaving(true);
        const save = share && shareToken ? api.saveShareMatch(shareToken, next) : api.saveMatch(id!, next);
        void save
          .then(({ match }) => setLastSaved(match.updatedAt))
          .catch((err) => setError(err instanceof Error ? err.message : 'Save failed'))
          .finally(() => setSaving(false));
      }, 400);
    },
    [id, share, shareToken]
  );

  const scored = useMemo(() => (config ? replay(config, points).points : []), [config, points]);
  const live = useMemo(
    () => (config ? replayUpTo(config, points, currentTime).score : null),
    [config, points, currentTime]
  );
  const activeIndex = useMemo(
    () =>
      scored.findIndex(
        (point) => currentTime >= point.startTime && currentTime <= point.endTime
      ),
    [currentTime, scored]
  );
  const inExistingPoint = activeIndex !== -1;
  const followIndex = inExistingPoint ? activeIndex : selectedIndex;

  useEffect(() => {
    const el = videoNode;
    if (!el) return;
    const update = () => setCurrentTime(el.currentTime);
    el.addEventListener('timeupdate', update);
    el.addEventListener('seeked', update);
    return () => {
      el.removeEventListener('timeupdate', update);
      el.removeEventListener('seeked', update);
    };
  }, [videoNode]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }
      const el = videoEl.current;
      if (!el) return;
      if (event.code === 'Space') {
        event.preventDefault();
        if (el.paused) void el.play();
        else el.pause();
        return;
      }
      if (event.key === 'ArrowLeft') {
        el.currentTime = Math.max(0, el.currentTime - (event.shiftKey ? 5 : 1));
        return;
      }
      if (event.key === 'ArrowRight') {
        el.currentTime = el.currentTime + (event.shiftKey ? 5 : 1);
        return;
      }
      if ((event.key === 'i' || event.key === 'I' || event.key === 's' || event.key === 'S') && !inExistingPoint) {
        startPoint();
        return;
      }
      if (event.key === '1') award(1);
      if (event.key === '2') award(2);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const seek = (time: number) => {
    if (videoEl.current) videoEl.current.currentTime = time;
  };

  const previewSeek = (time: number) => {
    if (!videoEl.current) return;
    videoEl.current.pause();
    videoEl.current.currentTime = time;
  };

  const startPoint = () => {
    const time = videoEl.current?.currentTime;
    if (time === undefined || isTimeInPoint(time, points)) return;
    setCurrentStart(time);
  };

  const award = (winner: PlayerId) => {
    const end = videoEl.current?.currentTime;
    if (currentStart === null || end === undefined || end <= currentStart) return;
    if (pointOverlapsExisting(currentStart, end, points)) return;
    const added: Point = {
      startTime: currentStart,
      endTime: end,
      winner,
      source: 'manual',
      confirmed: true,
    };
    const next = [...points, added].sort((a, b) => a.startTime - b.startTime);
    setPoints(next);
    setCurrentStart(null);
    persist({ points: next, config, playerNames: names });
  };

  const deletePoint = (index: number) => {
    const next = points.filter((_, i) => i !== index);
    setPoints(next);
    setSelectedIndex(null);
    persist({ points: next, config, playerNames: names });
  };

  const saveEdit = (index: number, updated: Point) => {
    const draft = points.map((point, i) => (i === index ? updated : point));
    if (pointOverlapsExisting(updated.startTime, updated.endTime, draft, index)) {
      setError('Edited point overlaps another point.');
      return;
    }
    const next = [...draft].sort((a, b) => a.startTime - b.startTime);
    setError('');
    setPoints(next);
    persist({ points: next, config, playerNames: names });
  };

  const startMatch = (nextConfig: MatchConfig) => {
    setConfig(nextConfig);
    persist({ config: nextConfig, playerNames: names, points });
  };

  const createShare = async () => {
    if (!id) return;
    let url = shareUrl;
    if (!url) {
      const { shareUrl: path } = await api.enableShare(id);
      url = `${window.location.origin}${path}`;
      setShareUrl(url);
    }
    await navigator.clipboard.writeText(url);
  };

  const reset = async () => {
    if (share || !id || !confirm('Clear all points and match setup?')) return;
    const { match } = await api.resetMatch(id);
    setConfig(match.config);
    setNames(match.playerNames);
    setPoints(match.points);
    setCurrentStart(null);
    setLastSaved(match.updatedAt);
  };

  const commitName = async () => {
    if (!video || !name.trim() || name.trim() === video.name) return;
    const { video: next } = await api.renameVideo(video.id, name.trim());
    setVideo(next);
  };

  if (error && !video) {
    return <div className="py-20 text-center text-red-600">{error}</div>;
  }
  if (!video || (!id && !shareToken)) {
    return <div className="py-20 text-center text-gray-500">Loading…</div>;
  }

  const fileUrl = share && shareToken ? api.shareFileUrl(shareToken) : api.videoFileUrl(video.id, accessToken);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => void commitName()}
            className="bg-transparent text-2xl font-semibold text-gray-900 outline-none"
          />
          <span className="text-sm text-gray-400">
            {saving ? 'Saving…' : lastSaved ? `Saved ${new Date(lastSaved).toLocaleTimeString()}` : ''}
          </span>
          {shareUrl && !share && (
            <span className="max-w-xs truncate text-xs text-indigo-500" title={shareUrl}>
              {shareUrl}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!share && (
            <>
              <button
                type="button"
                onClick={() => void createShare()}
                className="rounded-md border border-indigo-200 px-3 py-1.5 text-sm text-indigo-600"
              >
                {shareUrl ? 'Copy share link' : 'Create share link'}
              </button>
              <button type="button" onClick={() => void reset()} className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600">
                Reset match
              </button>
              <Link to="/" className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700">
                All matches
              </Link>
            </>
          )}
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg bg-white p-4 shadow">
          <video
            ref={attachVideo}
            src={fileUrl}
            controls
            className="aspect-video w-full rounded bg-black"
          />
          <Timeline
            video={videoNode}
            points={scored}
            pendingStart={currentStart}
            activeIndex={inExistingPoint ? activeIndex : null}
            onSeek={seek}
          />
        </div>

        <div className="rounded-lg bg-white p-4 shadow">
          <div className="mb-4 flex gap-2 border-b pb-2">
            <TabButton active={tab === 'score'} onClick={() => setTab('score')}>
              Scoring
            </TabButton>
            <TabButton active={tab === 'export'} onClick={() => setTab('export')}>
              Export
            </TabButton>
          </div>

          {tab === 'score' ? (
            config && live ? (
              <div className="space-y-4">
                <ScorePanel
                  config={config}
                  names={names}
                  score={live}
                  currentStart={currentStart}
                  currentTime={currentTime}
                  inExistingPoint={inExistingPoint}
                  activePointIndex={inExistingPoint ? activeIndex : null}
                  points={points}
                  videoDuration={videoNode?.duration || 0}
                  onStart={startPoint}
                  onWinner={award}
                  onNames={(next) => {
                    setNames(next);
                    persist({ config, playerNames: next, points });
                  }}
                  onSaveEdit={saveEdit}
                  onSeek={previewSeek}
                />
                <PointsList
                  points={scored}
                  names={names}
                  config={config}
                  selectedIndex={followIndex}
                  onSelect={(index) => {
                    setSelectedIndex(index);
                    seek(scored[index].startTime);
                  }}
                  onDelete={deletePoint}
                />
              </div>
            ) : (
              <MatchSetup
                names={names}
                onNames={(next) => {
                  setNames(next);
                  persist({ playerNames: next, points, config });
                }}
                onStart={startMatch}
              />
            )
          ) : (
            <ExportPanel
              videoId={video.id}
              videoName={video.name}
              points={points}
              shareToken={share ? shareToken : undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm ${
        active ? 'bg-white text-indigo-600 ring-1 ring-indigo-500' : 'text-gray-500 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}
