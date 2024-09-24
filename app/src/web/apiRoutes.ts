import { Router } from 'express';
import { authenticateToken } from './authMiddleware';
import { getStatus } from '@api/getStatus';

// Create a new router
const apiRouter = Router();

// GET /api/v1/status
apiRouter.get('/status', authenticateToken, getStatus);


export default apiRouter;
