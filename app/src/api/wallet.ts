import { Request, Response } from 'express';
import { Logger } from '@utils/logger';
import nodeManager from '@utils/node';
import { walletLoadAddresses } from '@utils/node';

/**
 * Get the wallet address
 * @param req Request
 * @param res Response
 * @returns Promise<void>
 */
export async function walletAddress(req: Request, res: Response): Promise<void>
{
	try
	{
		Logger.info('Getting wallet address');
		
		// Get node configuration
		const nodeConfig = nodeManager.getConfig();
		
		// Get the value from the configuration
		const address = nodeConfig.walletPublicAddress;
		// If address is empty
		if (address === '')
		{
			// If the passphrase is unavailable
			if (!nodeManager.passphraseAvailable())
				throw new Error('Passphrase unavailable');
			
			// Get the wallet passphrase stored in the configuration
			const passphrase = nodeConfig.walletPassphrase;
			
			// Load wallet information
			await walletLoadAddresses(passphrase);
		}
		
		// Return the wallet address
		Logger.info('Wallet address retrieved successfully');
		res.json({
			address: nodeConfig.walletPublicAddress,
		});
	}
	catch(error: any)
	{
		// Return a structured error response
		Logger.error(`Error getting wallet address: ${error}`);
		res.status(500).json({
			error: true,
			message: 'Error getting wallet address',
			address: null,
		});
	}
}
