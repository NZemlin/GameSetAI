import { useEffect, useState } from 'react';
import { api, type AccountRole } from '../api';
import { useAuth } from '../auth/AuthContext';

export default function Settings() {
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [role, setRole] = useState<AccountRole>(profile?.role || 'individual');

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName);
    setRole(profile.role);
  }, [profile]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      await api.updateMe({ displayName, role });
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-lg bg-white p-6 shadow">
        <h1 className="text-xl font-semibold text-gray-900">Account</h1>
        <p className="mt-1 text-sm text-gray-500">{profile?.email}</p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {saved && <p className="mt-3 text-sm text-emerald-600">Saved.</p>}
        <label className="mt-6 block text-sm font-medium text-gray-700">Display name</label>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <label className="mt-4 block text-sm font-medium text-gray-700">Account type</label>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setRole('individual')}
            className={`rounded-md px-3 py-1.5 text-sm ${
              role === 'individual' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Player
          </button>
          <button
            type="button"
            onClick={() => setRole('club')}
            className={`rounded-md px-3 py-1.5 text-sm ${
              role === 'club' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Club
          </button>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="mt-6 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:bg-indigo-300"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}
