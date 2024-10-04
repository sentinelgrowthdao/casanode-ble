import { Request, Response } from 'express';
import { Logger } from '@utils/logger';
import config from '@utils/configuration';
import nodeManager from '@utils/node';
import {
	containerStart,
	containerStop,
	containerRestart,
} from '@utils/docker';
import { walletLoadAddresses } from '@utils/node';
import { walletBalance } from '@utils/node';
import { walletUnlock } from '@utils/node';

/**
 * Get the node configuration
 * @param req Request
 * @param res Response
 * @returns Promise<void>
 */
export async function nodeConfiguration(req: Request, res: Response): Promise<void>
{
	// Get node configuration
	const nodeConfig = nodeManager.getConfig();
	
	// Return the node configuration
	res.json({
		moniker: nodeConfig.moniker || null,
		backend: nodeConfig.backend || null,
		nodeType: nodeConfig.node_type || null,
		nodeIp: nodeConfig.node_ip || null,
		nodePort: nodeConfig.node_port || null,
		vpnType: nodeConfig.vpn_type || null,
		vpnPort: nodeConfig.vpn_port || null,
		maximumPeers: nodeConfig.max_peers || null,
		dockerImage: config.DOCKER_IMAGE_NAME || null,
	});
}

/**
 * Start the node
 * @param req Request
 * @param res Response
 * @returns Promise<void>
 */
export async function nodeStart(req: Request, res: Response): Promise<void>
{
	try
	{
		// Start the node
		Logger.info('Starting node start process');
		const nodeStart = await containerStart();
		
		// Return the node start status
		Logger.info(`Node start completed successfully`);
		res.json({
			start: nodeStart,
		});
	}
	catch(error: any)
	{
		// Return a structured error response
		Logger.error(`Error during node start: ${error}`);
		res.status(500).json({
			error: true,
			message: 'Node start failed',
			start: false,
		});
	}
}

/**
 * Stop the node
 * @param req Request
 * @param res Response
 * @returns Promise<void>
 */
export async function nodeStop(req: Request, res: Response): Promise<void>
{
	try
	{
		// Stop the node
		Logger.info('Starting node stop process');
		const nodeStop = await containerStop();
		
		// Return the node stop status
		Logger.info(`Node stop completed successfully`);
		res.json({
			stop: nodeStop,
		});
	}
	catch(error: any)
	{
		// Return a structured error response
		Logger.error(`Error during node stop: ${error}`);
		res.status(500).json({
			error: true,
			message: 'Node stop failed',
			stop: false,
		});
	}
}

/**
 * Restart the node
 * @param req Request
 * @param res Response
 * @returns Promise<void>
 */
export async function nodeRestart(req: Request, res: Response): Promise<void>
{
	try
	{
		// Restart the node
		Logger.info('Starting node restart process');
		const nodeRestart = await containerRestart();
		
		// Return the node restart status
		Logger.info(`Node restart completed successfully`);
		res.json({
			restart: nodeRestart,
		});
	}
	catch(error: any)
	{
		// Return a structured error response
		Logger.error(`Error during node restart: ${error}`);
		res.status(500).json({
			error: true,
			message: 'Node restart failed',
			restart: false,
		});
	}
}

/**
 * Remove the node
 * @param req Request
 * @param res Response
 * @returns Promise<void>
 */
export async function nodeRemove(req: Request, res: Response): Promise<void>
{
	try
	{
		// Remove the node
		Logger.info('Starting node removal process');
		const nodeRemove = await containerRemove();
		
		// Return the node removal status
		Logger.info(`Node removal completed successfully`);
		res.json({
			remove: nodeRemove,
		});
	}
	catch(error: any)
	{
		// Return a structured error response
		Logger.error(`Error during node removal: ${error}`);
		res.status(500).json({
			error: true,
			message: 'Node removal failed',
			remove: false,
		});
	}
}

/**
 * Get the node address (sentnode...)
 * @param req Request
 * @param res Response
 * @returns Promise<void>
 */
export async function nodeAddress(req: Request, res: Response): Promise<void>
{
	try
	{
		Logger.info('Starting wallet address retrieval process');
		
		// Get node configuration
		const nodeConfig = nodeManager.getConfig();
		
		// Get the value from the configuration
		const address = nodeConfig.walletNodeAddress;
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
		
		// Return the value to the subscriber
		Logger.info('Wallet address retrieval completed successfully');
		res.json({
			address: nodeConfig.walletNodeAddress,
		});
	}
	catch(error: any)
	{
		// Return a structured error response
		Logger.error(`Error while loading the wallet address: ${error}`);
		res.status(500).json({
			error: true,
			message: 'Wallet address retrieval failed',
			address: '',
		});
	}
}

/**
 * Get the wallet node balance
 * @param req Request
 * @param res Response
 * @returns Promise<void>
 */
export async function nodeBalance(req: Request, res: Response): Promise<void>
{
	try
	{
		Logger.info('Starting wallet balance retrieval process');
		
		// Get the wallet public address from the node configuration
		const publicAddress = nodeManager.getConfig().walletPublicAddress;
		
		// Check if the public address is empty
		if(publicAddress === '')
		{
			Logger.error('Public address is missing');
			throw new Error('Public address is missing');
		}
		
		// Retrieve the wallet balance
		const balance = await walletBalance(publicAddress);
		
		// Return the wallet balance as a JSON response
		Logger.info(`Wallet balance retrieved successfully: ${balance.amount} ${balance.denom}`);
		res.json({
			balance: `${balance.amount} ${balance.denom}`
		});
		
	}
	catch (error: any)
	{
		// Handle errors and send an appropriate response
		Logger.error(`Error while retrieving wallet balance: ${error.message || error}`);
		res.status(500).json({
			error: true,
			message: 'Wallet balance retrieval failed',
			balance: '0 DVPN' // Returning 0 DVPN in case of failure
		});
	}
}

/**
 * Set the wallet passphrase
 * @param req Request
 * @param res Response
 * @returns Promise<void>
 */
export async function nodePassphrase(req: Request, res: Response): Promise<void>
{
	try
	{
		// Check if passphrase is required
		if (nodeManager.passphraseRequired() === false)
		{
			Logger.error('Passphrase is not required, but it was sent via API.');
			res.status(400).json({
				error: true,
				invalide: false,
				message: 'Passphrase is not required for this node.'
			});
			return ;
		}
		
		// Get the passphrase value from the request body
		const { passphrase } = req.body;
		
		// Check if the passphrase is valid (not empty)
		if (!passphrase || passphrase.trim().length === 0)
		{
			Logger.error('Invalid passphrase received via API.');
			res.status(400).json({
				error: true,
				invalide: true,
				message: 'Invalid or empty passphrase.'
			});
			return ;
		}
		
		// Try to unlock the wallet with the given passphrase
		const canUnlockWallet = await walletUnlock(passphrase);
		
		// If the passphrase is invalid
		if (!canUnlockWallet)
		{
			Logger.error('Invalid passphrase received via API for unlocking the wallet.');
			res.status(401).json({
				error: true,
				invalide: true,
				message: 'Invalid passphrase. Unable to unlock wallet.'
			});
			return ;
		}
		
		// Set the passphrase in the configuration
		nodeManager.setPassphrase(passphrase);
		Logger.info('Passphrase updated successfully via API.');
		
		// Return a success response
		res.json({
			success: true,
			message: 'Passphrase updated successfully.'
		});
	}
	catch (error: any)
	{
		// Handle any errors and return a structured response
		Logger.error(`Error while setting passphrase: ${error.message || error}`);
		res.status(500).json({
			error: true,
			invalide: false,
			message: 'Failed to set passphrase due to a server error.'
		});
	}
}
