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
	nodeStart,
	nodeStop,
	nodeRestart,
	nodeRemove,
	nodeAddress,
	nodeBalance,
	nodePassphrase,
} from '@/api/node';
import {
	installConfiguration,
	dockerImage,
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
// POST /api/v1/node/start
apiRouter.put('/node/start', authenticateToken, nodeStart);
// POST /api/v1/node/stop
apiRouter.put('/node/stop', authenticateToken, nodeStop);
// POST /api/v1/node/restart
apiRouter.put('/node/restart', authenticateToken, nodeRestart);
// DELETE /api/v1/node/remove
apiRouter.delete('/node/remove', authenticateToken, nodeRemove);
// GET /api/v1/node/address
apiRouter.get('/node/address', authenticateToken, nodeAddress);
// GET /api/v1/node/balance
apiRouter.get('/node/balance', authenticateToken, nodeBalance);
// POST /api/v1/node/passphrase
apiRouter.post('/node/passphrase', authenticateToken, nodePassphrase);

// POST /api/v1/install/configuration
apiRouter.post('/install/configuration', authenticateToken, installConfiguration);
// POST /api/v1/install/docker-image
apiRouter.post('/install/docker-image', authenticateToken, dockerImage);


export default apiRouter;