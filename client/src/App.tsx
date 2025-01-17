import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ResetPassword from './pages/auth/ResetPassword';
import RequestReset from './pages/auth/RequestReset';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import VideoUpload from './pages/VideoUpload';
import Videos from './pages/Videos';
import VideoEdit from './pages/VideoEdit';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route element={<Layout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/request-reset" element={<RequestReset />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/videos" element={
            <ProtectedRoute>
              <Videos />
            </ProtectedRoute>
          } />
          <Route path="/edit/:id" element={
            <ProtectedRoute>
              <VideoEdit />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/upload" element={
            <ProtectedRoute>
              <VideoUpload />
            </ProtectedRoute>
          } />

          {/* Redirect root to dashboard */}
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
