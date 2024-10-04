import { Request, Response } from 'express';
import { Logger } from '@utils/logger';
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
	// Get node configuration
	const nodeConfig = nodeManager.getConfig();
	
	// Return the status of the node
	res.json({
		version: nodeConfig.casanodeVersion || null,
		uptime: nodeConfig.systemUptime || null,
		nodeLocation: nodeConfig.nodeLocation || null,
		systemArch: nodeConfig.systemArch || null,
		systemKernel: nodeConfig.systemKernel || null,
		systemOs: nodeConfig.systemOs || null,
		status: dataStatus,
		certificate: certInfo,
	});
}
