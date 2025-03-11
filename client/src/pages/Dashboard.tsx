import { Link } from 'react-router-dom';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Welcome to GameSetAI</h2>
          <p className="text-gray-600 mb-6">Manage your tennis videos and get insights to improve your game.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              to="/videos"
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition duration-300"
            >
              <div className="flex flex-col items-center text-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-indigo-600 mb-4">
                  <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">My Videos</h3>
                <p className="text-sm text-gray-500">View and manage your uploaded tennis match videos.</p>
              </div>
            </Link>
            
            <Link
              to="/upload"
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition duration-300"
            >
              <div className="flex flex-col items-center text-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-indigo-600 mb-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Upload Video</h3>
                <p className="text-sm text-gray-500">Upload a new tennis match video for editing and analysis.</p>
              </div>
            </Link>
            
            <Link
              to="/profile"
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition duration-300"
            >
              <div className="flex flex-col items-center text-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-indigo-600 mb-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Profile</h3>
                <p className="text-sm text-gray-500">View and update your profile information.</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;