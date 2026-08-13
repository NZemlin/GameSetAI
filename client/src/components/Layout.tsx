import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
    isActive
      ? 'border-indigo-500 text-gray-900'
      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
  }`;

export default function Layout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const isShare = location.pathname.startsWith('/m/');
  const isAuthPage = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-gray-100">
      {!isShare && (
        <nav className="bg-white shadow-sm">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
            <div className="flex items-center gap-8">
              <Link to={user ? '/' : '/login'} className="text-xl font-semibold text-indigo-600">
                GameSetAI
              </Link>
              {user && !isAuthPage && (
                <div className="flex gap-6">
                  <NavLink to="/" end className={linkClass}>
                    Matches
                  </NavLink>
                  <NavLink to="/upload" className={linkClass}>
                    Upload
                  </NavLink>
                  <NavLink to="/settings" className={linkClass}>
                    Account
                  </NavLink>
                </div>
              )}
            </div>
            {user && !isAuthPage && (
              <button
                type="button"
                onClick={() => void signOut()}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Sign out
              </button>
            )}
          </div>
        </nav>
      )}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
