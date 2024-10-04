import { Router } from 'express';
import { authenticateToken } from './authMiddleware';
import { getStatus } from '@api/status';
import { checkInstallation, checkPort } from '@/api/check';

// Create a new router
const apiRouter = Router();

// GET /api/v1/status
apiRouter.get('/status', authenticateToken, getStatus);
// GET /api/v1/check/installation
apiRouter.get('/check/installation', authenticateToken, checkInstallation);
// GET /api/v1/check/port/:port
apiRouter.get('/check/port/:port', authenticateToken, checkPort);


export default apiRouter;
