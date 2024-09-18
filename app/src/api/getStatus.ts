import { Request, Response } from 'express';

import nodeManager from '@utils/node';

/**
 * GET /api/v1/status
 * Returns the node status
 * @param req Request
 * @param res Response
 * @returns void
 */
export async function getStatus(req: Request, res: Response): Promise<void>
{
	res.json({
		status: await nodeManager.getStatus(),
		uptime: nodeManager.getConfig().systemUptime,
	});
}
