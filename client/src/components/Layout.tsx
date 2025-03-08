import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    console.log('Token from localStorage:', token);

    if (!token) {
      console.log('No token found, setting isAuthenticated to false');
      setIsAuthenticated(false);
      return;
    }

    try {
      console.log('Validating token with backend...');
      const response = await axios.get('http://localhost:3000/api/auth/validate-token', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Token validation response:', response.data);
      setIsAuthenticated(response.status === 200);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error('Token validation error:', err.response?.data || err.message);
      } else {
        console.error('Token validation error:', err);
      }
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuth(); // Run on mount

    // Listen for storage events to detect token changes
    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);

    // Also re-run checkAuth when location changes (e.g., after login/signup)
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [location]); // Re-run when location changes

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:3000/api/auth/logout');
      localStorage.removeItem('token');
      setIsAuthenticated(false); // Update state immediately
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      navigate('/login');
    }
  };

  // Don't show navigation for auth pages
  const isAuthPage = ['/login', '/signup', '/reset-password', '/request-reset'].includes(location.pathname);

  if (isAuthPage) {
    return <Outlet />;
  }

  console.log('Rendering Layout, isAuthenticated:', isAuthenticated);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="px-4 py-4">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-xl font-semibold text-indigo-600">
                  GameSetAI
                </Link>
              </div>
              {isAuthenticated && (
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <Link
                    to="/dashboard"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      location.pathname === '/dashboard'
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/videos"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      location.pathname === '/videos'
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    My Videos
                  </Link>
                  <Link
                    to="/upload"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      location.pathname === '/upload'
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Upload Video
                  </Link>
                  <Link
                    to="/profile"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      location.pathname === '/profile'
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Profile
                  </Link>
                </div>
              )}
            </div>
            {isAuthenticated && (
              <div className="flex items-center">
                <button
                  onClick={handleLogout}
                  className="ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;