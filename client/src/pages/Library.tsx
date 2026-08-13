import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api, type Folder, type Video } from '../api';

type DragPayload = { kind: 'video'; id: string } | { kind: 'folder'; id: string };

function parseDrag(event: React.DragEvent): DragPayload | null {
  const raw = event.dataTransfer.getData('application/json') || event.dataTransfer.getData('text/plain');
  try {
    const data = JSON.parse(raw) as DragPayload;
    if (data.kind === 'video' || data.kind === 'folder') return data;
  } catch {
    return null;
  }
  return null;
}

function isDescendant(folders: Folder[], ancestorId: string, nodeId: string): boolean {
  let current = folders.find((folder) => folder.id === nodeId);
  const seen = new Set<string>();
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    if (seen.has(current.parentId)) return false;
    seen.add(current.parentId);
    current = folders.find((folder) => folder.id === current?.parentId);
  }
  return false;
}

export default function Library() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState('');
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [overId, setOverId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const folderId = searchParams.get('folder');
  const { session, profile } = useAuth();
  const token = session?.access_token;
  const isClub = profile?.role === 'club';

  const load = async () => {
    try {
      const [{ videos: nextVideos }, { folders: nextFolders }] = await Promise.all([
        api.listVideos(),
        api.listFolders(),
      ]);
      setVideos(nextVideos);
      setFolders(nextFolders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const inFolder = Boolean(folderId);
  const currentFolder = folders.find((folder) => folder.id === folderId);

  const crumbs = useMemo(() => {
    const path: Folder[] = [];
    let current = currentFolder;
    const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      path.unshift(current);
      seen.add(current.id);
      current = folders.find((folder) => folder.id === current?.parentId);
    }
    return path;
  }, [currentFolder, folders]);

  const childFolders = folders.filter((folder) => (folder.parentId || null) === (folderId || null));
  const visibleVideos = videos.filter((video) => (video.folderId || null) === (folderId || null));

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    const collect = (id: string): number => {
      if (map.has(id)) return map.get(id) || 0;
      const direct = videos.filter((video) => video.folderId === id).length;
      const nested = folders.filter((folder) => folder.parentId === id).reduce((sum, folder) => sum + collect(folder.id), 0);
      map.set(id, direct + nested);
      return direct + nested;
    };
    folders.forEach((folder) => collect(folder.id));
    return map;
  }, [folders, videos]);

  const saveName = async (id: string) => {
    if (!name.trim()) return;
    const { video } = await api.renameVideo(id, name.trim());
    setVideos((prev) => prev.map((item) => (item.id === id ? video : item)));
    setEditingId(null);
  };

  const remove = async (id: string) => {
    await api.deleteVideo(id);
    setVideos((prev) => prev.filter((item) => item.id !== id));
    setDeletingId(null);
  };

  const copyShare = async (video: Video) => {
    let path = video.shareToken ? `/m/${video.shareToken}` : '';
    if (!path) {
      const { video: updated, shareUrl } = await api.enableShare(video.id);
      setVideos((prev) => prev.map((item) => (item.id === video.id ? updated : item)));
      path = shareUrl;
    }
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopiedId(video.id);
    window.setTimeout(() => setCopiedId(null), 1500);
  };

  const addFolder = async () => {
    if (!newFolder.trim()) return;
    const { folder } = await api.createFolder(newFolder.trim(), folderId);
    setFolders((prev) => [folder, ...prev]);
    setNewFolder('');
  };

  const saveFolderName = async (id: string) => {
    if (!folderName.trim()) return;
    const { folder } = await api.renameFolder(id, folderName.trim());
    setFolders((prev) => prev.map((item) => (item.id === id ? folder : item)));
    setRenamingFolder(null);
  };

  const folderTreeIds = (rootId: string): string[] => {
    const ids = [rootId];
    folders
      .filter((folder) => folder.parentId === rootId)
      .forEach((child) => ids.push(...folderTreeIds(child.id)));
    return ids;
  };

  const removeFolder = async (folder: Folder) => {
    const ids = folderTreeIds(folder.id);
    await api.deleteFolder(folder.id);
    setFolders((prev) => prev.filter((item) => !ids.includes(item.id)));
    setVideos((prev) => prev.filter((video) => !video.folderId || !ids.includes(video.folderId)));
    setDeletingFolder(null);
    if (folderId && ids.includes(folderId)) {
      const parent = folder.parentId;
      if (parent) setSearchParams({ folder: parent });
      else setSearchParams({});
    }
  };

  const moveToFolder = async (payload: DragPayload, targetFolderId: string | null) => {
    if (payload.kind === 'video') {
      const video = videos.find((item) => item.id === payload.id);
      if (!video || (video.folderId || null) === targetFolderId) return;
      const { video: updated } = await api.moveVideo(payload.id, targetFolderId);
      setVideos((prev) => prev.map((item) => (item.id === payload.id ? updated : item)));
      return;
    }
    if (payload.id === targetFolderId) return;
    if (targetFolderId && (payload.id === targetFolderId || isDescendant(folders, payload.id, targetFolderId))) {
      return;
    }
    const folder = folders.find((item) => item.id === payload.id);
    if (!folder || (folder.parentId || null) === targetFolderId) return;
    const { folder: updated } = await api.moveFolder(payload.id, targetFolderId);
    setFolders((prev) => prev.map((item) => (item.id === payload.id ? updated : item)));
  };

  const startDrag = (event: React.DragEvent, payload: DragPayload) => {
    event.dataTransfer.setData('application/json', JSON.stringify(payload));
    event.dataTransfer.setData('text/plain', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'move';
  };

  const allowDrop = (event: React.DragEvent, id: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setOverId(id);
  };

  const dropOn = async (event: React.DragEvent, targetFolderId: string | null, highlightId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setOverId(null);
    const payload = parseDrag(event);
    if (!payload) return;
    await moveToFolder(payload, targetFolderId);
    void highlightId;
  };

  const parentTarget = currentFolder?.parentId || null;

  const renderVideoCard = (video: Video) => (
    <div
      key={video.id}
      draggable
      onDragStart={(event) => startDrag(event, { kind: 'video', id: video.id })}
      className="cursor-grab overflow-hidden rounded-lg bg-white shadow active:cursor-grabbing"
    >
      <Link to={`/edit/${video.id}`}>
        <video
          src={api.videoFileUrl(video.id, token)}
          className="pointer-events-none aspect-video w-full bg-gray-900 object-cover"
          preload="metadata"
        />
      </Link>
      <div className="p-4">
        {editingId === video.id ? (
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
            />
            <button type="button" onClick={() => void saveName(video.id)} className="text-sm text-indigo-600">
              Save
            </button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link to={`/edit/${video.id}`} className="font-medium text-gray-900 hover:text-indigo-600">
                {video.name}
              </Link>
              <p className="text-sm text-gray-500">{new Date(video.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => {
                  setEditingId(video.id);
                  setName(video.name);
                }}
                className="text-xs text-gray-500 hover:text-gray-800"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => setDeletingId(video.id)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => void copyShare(video)}
          className="mt-3 w-full rounded-md border border-indigo-200 px-2 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
        >
          {copiedId === video.id ? 'Copied' : video.shareToken ? 'Copy player link' : 'Create player link'}
        </button>
      </div>
    </div>
  );

  if (loading) {
    return <div className="py-20 text-center text-gray-500">Loading matches…</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          {inFolder ? (
            <div>
              <div className="flex flex-wrap items-center gap-1 text-sm">
                <button
                  type="button"
                  onClick={() => setSearchParams({})}
                  onDragOver={(event) => allowDrop(event, 'root')}
                  onDragLeave={() => setOverId(null)}
                  onDrop={(event) => void dropOn(event, null, 'root')}
                  className={`rounded px-1 ${overId === 'root' ? 'bg-indigo-100 text-indigo-700' : 'text-indigo-600'}`}
                >
                  All folders
                </button>
                {crumbs.map((crumb, index) => {
                  const last = index === crumbs.length - 1;
                  return (
                    <span key={crumb.id} className="flex items-center gap-1">
                      <span className="text-gray-400">/</span>
                      {last ? (
                        <span className="text-gray-700">{crumb.name}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSearchParams({ folder: crumb.id })}
                          onDragOver={(event) => allowDrop(event, crumb.id)}
                          onDragLeave={() => setOverId(null)}
                          onDrop={(event) => void dropOn(event, crumb.id, crumb.id)}
                          className={`rounded px-1 ${overId === crumb.id ? 'bg-indigo-100 text-indigo-700' : 'text-indigo-600'}`}
                        >
                          {crumb.name}
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
              <h1 className="mt-1 text-2xl font-semibold text-gray-900">{currentFolder?.name || 'Folder'}</h1>
              <p className="mt-1 text-sm text-gray-500">Drag a match onto a folder, or onto the path above to move it out.</p>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{isClub ? 'Tournaments' : 'Matches'}</h1>
              <p className="mt-1 text-sm text-gray-500">
                Drag a match onto a folder to file it. Folders can go inside other folders the same way.
              </p>
            </div>
          )}
        </div>
        <Link
          to={inFolder ? `/upload?folder=${folderId}` : '/upload'}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Upload video
        </Link>
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mb-6 flex flex-wrap items-end gap-2">
        <input
          value={newFolder}
          onChange={(e) => setNewFolder(e.target.value)}
          placeholder={
            inFolder
              ? 'New folder in here'
              : isClub
                ? 'New tournament, e.g. Labor Day Open'
                : 'New folder'
          }
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void addFolder()}
          className="rounded-md border border-indigo-200 px-3 py-2 text-sm text-indigo-600"
        >
          Create folder
        </button>
        {inFolder && (
          <button
            type="button"
            onDragOver={(event) => allowDrop(event, 'up')}
            onDragLeave={() => setOverId(null)}
            onDrop={(event) => void dropOn(event, parentTarget, 'up')}
            className={`rounded-md border px-3 py-2 text-sm ${
              overId === 'up' ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'
            }`}
          >
            Drop here to move up
          </button>
        )}
      </div>

      {childFolders.length === 0 && visibleVideos.length === 0 ? (
        <div
          onDragOver={(event) => allowDrop(event, 'empty')}
          onDragLeave={() => setOverId(null)}
          onDrop={(event) => void dropOn(event, folderId, 'empty')}
          className={`rounded-lg py-16 text-center shadow ${overId === 'empty' ? 'bg-indigo-50' : 'bg-white'}`}
        >
          <p className="text-gray-500">{inFolder ? 'This folder is empty.' : 'No videos yet.'}</p>
          <Link
            to={inFolder ? `/upload?folder=${folderId}` : '/upload'}
            className="mt-3 inline-block text-indigo-600 hover:text-indigo-500"
          >
            Upload a match
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {childFolders.map((folder) => (
            <div
              key={folder.id}
              draggable
              onDragStart={(event) => startDrag(event, { kind: 'folder', id: folder.id })}
              onDragOver={(event) => allowDrop(event, folder.id)}
              onDragLeave={() => setOverId(null)}
              onDrop={(event) => void dropOn(event, folder.id, folder.id)}
              className={`rounded-lg bg-white p-4 shadow ${overId === folder.id ? 'ring-2 ring-indigo-400' : ''}`}
            >
              {renamingFolder === folder.id ? (
                <div className="flex gap-2">
                  <input
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                  <button type="button" onClick={() => void saveFolderName(folder.id)} className="text-sm text-indigo-600">
                    Save
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setSearchParams({ folder: folder.id })} className="w-full text-left">
                  <div className="mb-3 flex aspect-video items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                    <span className="text-sm font-medium">{counts.get(folder.id) || 0} matches</span>
                  </div>
                  <p className="font-medium text-gray-900">{folder.name}</p>
                  <p className="text-sm text-gray-500">Drop matches here</p>
                </button>
              )}
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRenamingFolder(folder.id);
                    setFolderName(folder.name);
                  }}
                  className="text-xs text-gray-500"
                >
                  Rename
                </button>
                <button type="button" onClick={() => setDeletingFolder(folder)} className="text-xs text-red-500">
                  Delete
                </button>
              </div>
            </div>
          ))}
          {visibleVideos.map(renderVideoCard)}
        </div>
      )}

      {deletingFolder && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-medium text-gray-900">Delete “{deletingFolder.name}”?</h2>
            <p className="mt-3 text-sm text-gray-600">
              This permanently deletes the folder, every nested folder inside it, and every match in
              those folders — including their points, clips, and exports.
            </p>
            <p className="mt-2 text-sm font-medium text-red-700">
              {counts.get(deletingFolder.id) || 0} match
              {(counts.get(deletingFolder.id) || 0) === 1 ? '' : 'es'} will be removed. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeletingFolder(null)} className="text-sm text-gray-600">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void removeFolder(deletingFolder)}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white"
              >
                Delete everything
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-medium">Delete this video?</h2>
            <p className="mt-2 text-sm text-gray-500">This also deletes its points, clips, and exports.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeletingId(null)} className="text-sm text-gray-600">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void remove(deletingId)}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
