import { Request, Response } from 'express';

import nodeManager from '@utils/node';
import { getNodeStatus, type NodeStatus } from '@utils/node';
import { certificateInfo, type CertificateInfo } from '@utils/certificate';

/**
 * GET /api/v1/status
 * Returns the node status
 * @param req Request
 * @param res Response
 * @returns void
 */
export async function getStatus(req: Request, res: Response): Promise<void>
{
	// Get the status of the node
	const dataStatus : NodeStatus|null = await getNodeStatus();
	// Get the certificate information
	const certInfo : CertificateInfo|null = certificateInfo();
	
	// Return the status of the node
	res.json({
		version: nodeManager.getConfig().casanodeVersion,
		uptime: nodeManager.getConfig().systemUptime,
		status: dataStatus,
		certificate: certInfo,
	});
}
