import { Request, Response } from 'express';
import { Logger } from '@utils/logger';
import {
	certificateGenerate as nodeCertificateGenerate,
	certificateRemove as nodeCertificateRemove,
} from '@utils/certificate';

/**
 * GET /api/v1/certificate/renew
 * Renew the node certificate
 * @param req Request
 * @param res Response
 * @returns void
 */
export async function certificateRenew(req: Request, res: Response): Promise<void>
{
	try
	{
		// Generate a new certificate
		Logger.info('Starting certificate renewal process');
		const certRenew : boolean = await nodeCertificateGenerate();
		
		// Return the certificate renewal status
		Logger.info(`Certificate renewal completed successfully`);
		res.json({
			renew: certRenew,
		});
	}
	catch(error: any)
	{
		// Return a structured error response
		Logger.error(`Error during configuration installation: ${error}`);
		res.status(500).json({
			error: true,
			message: 'Certificate renewal failed',
			renew: false,
		});
	}
}

/**
 * GET /api/v1/certificate/remove
 * Remove the node certificate
 */
export async function certificateRemove(req: Request, res: Response): Promise<void>
{
	try
	{
		// Remove the certificate
		Logger.info('Starting certificate removal process');
		const certRemove : boolean = await nodeCertificateRemove();
		
		// Return the certificate removal status
		Logger.info(`Certificate removal completed successfully`);
		res.json({
			remove: certRemove,
		});
	}
	catch(error: any)
	{
		// Return a structured error response
		Logger.error(`Error during certificate removal: ${error}`);
		res.status(500).json({
			error: true,
			message: 'Certificate removal failed',
			remove: false,
		});
	}
}
