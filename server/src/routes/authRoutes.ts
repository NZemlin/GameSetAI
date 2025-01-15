import { Router, RequestHandler } from 'express';
import { signup, login, requestPasswordReset, resetPassword, logout } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Public routes
router.post('/signup', (signup as unknown) as RequestHandler);
router.post('/login', (login as unknown) as RequestHandler);
router.post('/password-reset-request', (requestPasswordReset as unknown) as RequestHandler);
router.post('/password-reset', (resetPassword as unknown) as RequestHandler);

// Protected routes
router.post('/logout', authenticateToken, (logout as unknown) as RequestHandler);

export default router; 