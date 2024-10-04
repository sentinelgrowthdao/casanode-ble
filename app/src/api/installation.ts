
import { Request, Response } from 'express';
import { Logger } from '@utils/logger';
import {
	createNodeConfig,
	createVpnConfig,
} from '@utils/node';
import { certificateGenerate } from '@utils/certificate';

/**
 * Install the configuration
 * @param req Request
 * @param res Response
 */
export async function installConfiguration(req: Request, res: Response): Promise<void>
{
	// Status summary of node, VPN, and certificate generation
	let statusSummary =
	{
		nodeConfig: false,
		vpnConfig: false,
		certificate: false
	};
	
	try
	{
		Logger.info('Starting configuration installation process');
		
		// Start creating the node configuration
		statusSummary.nodeConfig = await createNodeConfig();
		
		// Start creating the VPN configuration
		statusSummary.vpnConfig = await createVpnConfig();
		
		// Start generating the certificate
		statusSummary.certificate = await certificateGenerate();
		
		Logger.info(`Configuration installation completed successfully`);
		// Return the status summary in a well-structured JSON response
		res.json(statusSummary);
	}
	catch(error)
	{
		Logger.error(`Error during configuration installation: ${error}`);
		// Return a structured error response
		res.status(500).json({
			error: true,
			message: 'Configuration installation failed',
			...statusSummary,
		});
	}
}
