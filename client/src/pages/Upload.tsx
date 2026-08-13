import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, type Folder } from '../api';

function folderPath(folders: Folder[], id: string): string {
  const parts: string[] = [];
  let current = folders.find((folder) => folder.id === id);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    parts.unshift(current.name);
    seen.add(current.id);
    current = folders.find((folder) => folder.id === current?.parentId);
  }
  return parts.join(' / ');
}
import { useAuth } from '../auth/AuthContext';

export default function Upload() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const isClub = profile?.role === 'club';
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderId, setFolderId] = useState(searchParams.get('folder') || '');
  const [newFolder, setNewFolder] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void api.listFolders().then(({ folders: next }) => setFolders(next));
  }, []);

  const createFolder = async () => {
    if (!newFolder.trim()) return;
    const { folder } = await api.createFolder(newFolder.trim(), folderId || null);
    setFolders((prev) => [folder, ...prev]);
    setFolderId(folder.id);
    setNewFolder('');
  };

  const submit = async () => {
    if (!file || !name.trim()) {
      setError('Choose a video and give it a name.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const { video } = await api.uploadVideo(file, name.trim(), setProgress, folderId || null);
      navigate(`/edit/${video.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-lg bg-white p-6 shadow">
        <h1 className="text-xl font-semibold text-gray-900">Upload a match</h1>
        <p className="mt-1 text-sm text-gray-500">MP4, MOV, AVI, or WebM. Max 5GB.</p>

        <label className="mt-6 block text-sm font-medium text-gray-700">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={uploading}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="Saturday vs Jordan"
        />

        <label className="mt-4 block text-sm font-medium text-gray-700">
          {isClub ? 'Tournament folder' : 'Folder'}
        </label>
        <select
          value={folderId}
          onChange={(e) => setFolderId(e.target.value)}
          disabled={uploading}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Unfiled</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folderPath(folders, folder.id)}
            </option>
          ))}
        </select>
        <div className="mt-2 flex gap-2">
          <input
            value={newFolder}
            onChange={(e) => setNewFolder(e.target.value)}
            disabled={uploading}
            placeholder={isClub ? 'Or create a tournament…' : 'Or create a folder…'}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void createFolder()}
            disabled={uploading}
            className="rounded-md border border-indigo-200 px-3 py-2 text-sm text-indigo-600"
          >
            Create
          </button>
        </div>

        <label className="mt-4 block text-sm font-medium text-gray-700">File</label>
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
          disabled={uploading}
          onChange={(e) => {
            const next = e.target.files?.[0] ?? null;
            setFile(next);
            if (next && !name.trim()) setName(next.name.replace(/\.[^.]+$/, ''));
          }}
          className="mt-1 block w-full text-sm"
        />

        {uploading && (
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-indigo-600">
              <span>Uploading</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-indigo-100">
              <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={!file || uploading}
          className="mt-6 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300"
        >
          {uploading ? 'Uploading…' : 'Upload and open editor'}
        </button>
      </div>
    </div>
  );
}
