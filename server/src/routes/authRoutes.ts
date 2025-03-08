import express from 'express';
import { login, signup, requestPasswordReset, resetPassword, logout, validateToken, getProfile } from '../controllers/authController';

const router = express.Router();

// POST /api/auth/login - User login
router.post('/login', login);

// POST /api/auth/signup - User signup
router.post('/signup', signup);

// POST /api/auth/password-reset-request - Request password reset
router.post('/password-reset-request', requestPasswordReset);

// POST /api/auth/reset-password - Reset password
router.post('/reset-password', resetPassword);

// POST /api/auth/logout - Logout
router.post('/logout', logout);

// GET /api/auth/validate-token - Validate JWT token
router.get('/validate-token', validateToken);

// GET /api/auth/profile - Get user profile
router.get('/profile', getProfile);

export default router;