import { Router } from 'express';
import { authenticateToken } from './authMiddleware';
import { getStatus } from '@api/status';
import { checkInstallation, checkPort } from '@/api/check';
import {
	certificateRenew,
	certificateRemove
} from '@/api/certificate';
import {
	nodeConfiguration,
} from '@/api/node';
import {
	installConfiguration,
} from '@/api/installation';

// Create a new router
const apiRouter = Router();

// GET /api/v1/status
apiRouter.get('/status', authenticateToken, getStatus);
// GET /api/v1/check/installation
apiRouter.get('/check/installation', authenticateToken, checkInstallation);
// GET /api/v1/check/port/:port
apiRouter.get('/check/port/:port', authenticateToken, checkPort);

// POST /api/v1/certificate/renew
apiRouter.post('/certificate/renew', authenticateToken, certificateRenew);
// DELETE /api/v1/certificate/remove
apiRouter.delete('/certificate/remove', authenticateToken, certificateRemove);

// GET /api/v1/node/configuration
apiRouter.get('/node/configuration', authenticateToken, nodeConfiguration);

// POST /api/v1/install/configuration
apiRouter.post('/install/configuration', authenticateToken, installConfiguration);


export default apiRouter;
