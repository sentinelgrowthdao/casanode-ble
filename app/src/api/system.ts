import { Request, Response } from 'express';
import { Logger } from '@utils/logger';
import { refreshNetworkConfiguration } from '@utils/configuration';
import {
	updateSystem,
	rebootSystem,
} from '@utils/system';

/**
 * Update the system
 * @param req Request
 * @param res Response
 * @returns Promise<void>
 */
export async function systemUpdate(req: Request, res: Response): Promise<void>
{
	// Get the target from the request body
	const { target } = req.body;
	
	try
	{
		if(target === 'system')
		{
			// Update the system
			Logger.info('Updating the system');
			await updateSystem();
			
			// Return the update status
			Logger.info('System updated successfully');
			res.json({
				success: true,
			});
		}
		else if(target === 'sentinel')
		{
			// Update Sentinel
			Logger.info('Updating Sentinel');
			await refreshNetworkConfiguration();
			
			// Return the update status
			Logger.info('Sentinel updated successfully');
			res.json({
				success: true,
			});
		}
		else
		{
			Logger.error('Invalid system update target');
			res.status(400).json({
				error: true,
				message: 'Invalid system update target',
				success: false,
			});
		}
	}
	catch(error: any)
	{
		// Return a structured error response
		Logger.error(`Error during node update: ${error}`);
		res.status(500).json({
			error: true,
			message: 'Node update failed',
			success: false,
		});
	}
}

/**
 * Reboot the system
 * @param req Request
 * @param res Response
 * @returns Promise<void>
 */
export async function systemReboot(req: Request, res: Response): Promise<void>
{
	try
	{
		// Reboot the system
		Logger.info('Rebooting the system');
		await rebootSystem();
		
		// Return the reboot status
		Logger.info('System rebooted successfully');
		res.json({
			success: true,
		});
	}
	catch(error: any)
	{
		// Return a structured error response
		Logger.error(`Error during node reboot: ${error}`);
		res.status(500).json({
			error: true,
			message: 'Node reboot failed',
			success: false,
		});
	}
}
