import { Request, Response } from 'express';
import { Logger } from '@utils/logger';
import config from '@utils/configuration';
import nodeManager from '@utils/node';
import {
	containerStart,
	containerStop,
	containerRestart,
} from '@utils/docker';

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
			console.log('Address is empty');
			console.log(`Passphrase available: ${nodeManager.passphraseAvailable()}`);
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
