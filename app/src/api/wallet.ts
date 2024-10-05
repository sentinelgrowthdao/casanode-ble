import { Request, Response } from 'express';
import { Logger } from '@utils/logger';
import nodeManager from '@utils/node';
import { walletLoadAddresses } from '@utils/node';
import {
	walletExists,
	walletCreate as walletCreateUtil,
	walletRecover as walletRecoverUtil,
	walletRemove as walletRemoveUtil,
} from '@utils/node';

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

/**
 * Create a new wallet
 * @param req Request
 * @param res Response
 * @returns Promise<void>
 */
export async function walletCreate(req: Request, res: Response): Promise<void>
{
	try
	{
		Logger.info('Creating wallet');
		
		// Get node configuration
		const nodeConfig = nodeManager.getConfig();
		
		// Get the wallet passphrase stored in the configuration
		const passphrase = nodeConfig.walletPassphrase;
		
		// Check if the wallet already exists
		const exists = await walletExists(passphrase);
		
		// Skip if wallet already exists
		if(exists)
		{
			Logger.error('Wallet already exists');
			res.status(400).json({
				error: true,
				message: 'Wallet already exists',
				success: false,
			});
			return;
		}
		
		// Create the wallet and get the mnemonic
		const mnemonic : string[]|null|undefined = await walletCreateUtil(passphrase);
		
		// If an error occurred while creating the wallet
		if(typeof mnemonic === 'undefined' || mnemonic === null)
		{
			Logger.error('Error creating wallet');
			res.status(500).json({
				error: true,
				message: 'Error creating wallet',
				success: false,
			});
			return;
		}
		
		// Return the mnemonic as part of the response
		Logger.info('Wallet created successfully');
		res.json({
			success: true,
			mnemonic: mnemonic,
		});
	}
	catch(error: any)
	{
		// Return a structured error response
		Logger.error(`Error creating wallet: ${error}`);
		res.status(500).json({
			error: true,
			message: 'Error creating wallet',
			success: false,
			mnemonic: null,
		});
	}
}

/**
 * Restore a wallet
 * @param req Request
 * @param res Response
 * @returns Promise<void>
 */
export async function walletRestore(req: Request, res: Response): Promise<void>
{
	try
	{
		Logger.info('Recovering wallet');
		
		// Get node configuration
		const nodeConfig = nodeManager.getConfig();
		
		// Get the wallet passphrase stored in the configuration
		const passphrase = nodeConfig.walletPassphrase;
		
		// Check if the wallet already exists
		const exists = await walletExists(passphrase);
		
		// Skip if wallet already exists
		if(exists)
		{
			Logger.error('Wallet already exists');
			res.status(400).json({
				error: true,
				message: 'Wallet already exists',
				success: false,
			});
			return;
		}
		
		// Get the mnemonic from the request body
		const { mnemonic } = req.body;
		// Restore the wallet
		const success = await walletRecoverUtil(mnemonic, passphrase);
		
		// If an error occurred while recovering the wallet
		if(!success)
			throw new Error('Error recovering wallet');
		
		// Return the wallet address
		Logger.info('Wallet recovered successfully');
		res.json({
			success: true,
		});
	}
	catch(error: any)
	{
		// Return a structured error response
		Logger.error(`Error recovering wallet: ${error}`);
		res.status(500).json({
			error: true,
			message: 'Error recovering wallet',
			success: false,
		});
	}
}

/**
 * Remove the wallet
 * @param req Request
 * @param res Response
 * @returns Promise<void>
 */
export async function walletRemove(req: Request, res: Response): Promise<void>
{
	try
	{
		Logger.info('Removing wallet');
		
		// Get node configuration
		const nodeConfig = nodeManager.getConfig();
		
		// Get the wallet passphrase stored in the configuration
		const passphrase = nodeConfig.walletPassphrase;
		
		// Check if the wallet already exists
		const exists = await walletExists(passphrase);
		
		// If wallet does not exist
		if(!exists)
		{
			Logger.error('Wallet does not exist');
			res.status(400).json({
				error: true,
				message: 'Wallet does not exist',
				success: false,
			});
			return;
		}
		
		// Remove the wallet
		const success = await walletRemoveUtil(passphrase);
		
		// If an error occurred while removing the wallet
		if(!success)
			throw new Error('Error removing wallet');
		
		// Return the wallet address
		Logger.info('Wallet removed successfully');
		res.json({
			success: true,
		});
	}
	catch(error: any)
	{
		// Return a structured error response
		Logger.error(`Error removing wallet: ${error}`);
		res.status(500).json({
			error: true,
			message: 'Error removing wallet',
			success: false,
		});
	}
}