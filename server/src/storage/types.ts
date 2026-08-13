import type { MatchConfig, Point } from '@gamesetai/scoring';

export interface VideoRecord {
  id: string;
  userId?: string;
  name: string;
  filename: string;
  originalFilename: string;
  createdAt: string;
  size: number;
  shareToken?: string | null;
  folderId?: string | null;
}

export interface FolderRecord {
  id: string;
  name: string;
  createdAt: string;
  parentId?: string | null;
}

export interface MatchRecord {
  videoId: string;
  config: MatchConfig | null;
  playerNames: { player1: string; player2: string };
  points: Point[];
  updatedAt: string;
}

export interface ClipRecord {
  id: string;
  videoId: string;
  startTime: number;
  endTime: number;
  label: string;
  filename: string;
  includeScoreboard: boolean;
  createdAt: string;
}

export interface ExportRecord {
  id: string;
  videoId: string;
  label: string;
  filename: string;
  pointCount: number;
  includeScoreboard: boolean;
  createdAt: string;
}

export interface ExportProgress {
  active: boolean;
  completed: boolean;
  error?: string;
  total: number;
  current: number;
  message: string;
}

export interface Store {
  listVideos(): Promise<VideoRecord[]>;
  getVideo(id: string): Promise<VideoRecord | null>;
  createVideo(video: VideoRecord): Promise<VideoRecord>;
  updateVideo(id: string, patch: Partial<Pick<VideoRecord, 'name' | 'folderId'>>): Promise<VideoRecord | null>;
  deleteVideo(id: string): Promise<boolean>;

  getMatch(videoId: string): Promise<MatchRecord | null>;
  saveMatch(match: MatchRecord): Promise<MatchRecord>;
  deleteMatch(videoId: string): Promise<void>;

  listClips(videoId: string): Promise<ClipRecord[]>;
  getClip(id: string): Promise<ClipRecord | null>;
  saveClip(clip: ClipRecord): Promise<ClipRecord>;
  deleteClip(id: string): Promise<boolean>;

  listExports(videoId: string): Promise<ExportRecord[]>;
  getExport(id: string): Promise<ExportRecord | null>;
  saveExport(record: ExportRecord): Promise<ExportRecord>;
  deleteExport(id: string): Promise<boolean>;
}
