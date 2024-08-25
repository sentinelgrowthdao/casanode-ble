import { createRequire } from 'module';
import { exec } from 'child_process';
import * as os from 'os';
import * as fs from 'fs/promises';

import { Logger } from '@utils/logger';
import { imagePull, containerStop, imagesRemove, containerRemove } from '@utils/docker';
import nodeManager from '@utils/node';
import { resetConfiguration } from '@utils/configuration';

enum SystemActionStatus
{
	NOT_STARTED = 0,
	IN_PROGRESS = 1,
	COMPLETED = 2,
	ERROR = -1
}

export class SystemActionsCharacteristic
{
	/**
	 * Bleno instance
	 * @type any
	 */
	private Bleno: any = undefined;
	
	/**
	 * UUID of the characteristic
	 * @type string
	 */
	private characteristicUuid: string = '';
	
	/**
	 * System action status
	 * @type SystemActionStatus
	 */
	private actionStatus: SystemActionStatus = SystemActionStatus.NOT_STARTED;
	
	/**
	 * Create a new instance of Characteristic
	 */
	constructor(private uuid: string) 
	{
		const require = createRequire(import.meta.url);
		this.Bleno = require('bleno');
		this.characteristicUuid = uuid;
	}
	
	/**
	 * Create a new instance of SystemActionsCharacteristic
	 */
	public create() 
	{
		if(this.Bleno === undefined)
			return null;
		
		return new this.Bleno.Characteristic({
			uuid: this.characteristicUuid,
			properties: ['read', 'write'],
			onReadRequest: this.onReadRequest.bind(this),
			onWriteRequest: this.onWriteRequest.bind(this),
		});
	}
	
	/**
	 * Called when the characteristic is read
	 * @param offset number
	 * @param callback (result: number, data: Buffer) => void
	 * @returns void
	 */
	public onReadRequest(offset: number, callback: (result: number, data: Buffer) => void)
	{
		let response;
		switch(this.actionStatus)
		{
			case SystemActionStatus.NOT_STARTED:
				response = '0'; 
				break;
			case SystemActionStatus.IN_PROGRESS:
				response = '1'; 
				break;
			case SystemActionStatus.COMPLETED:
				response = '2'; 
				break;
			case SystemActionStatus.ERROR:
				response = '-1'; 
				break;
			default:
				response = '0'; 
				break;
		}
		
		Logger.info(`System action status: ${response}`);
		callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(response));
	}
	
	/**
	 * Called when the characteristic is written
	 * @param data Buffer
	 * @param offset number
	 * @param withoutResponse boolean
	 * @param callback (result: number) => void
	 * @returns void
	 */
	public onWriteRequest(data: Buffer, offset: number, withoutResponse: boolean, callback: (result: number) => void)
	{
		const action = data.toString('utf-8').trim();
		
		if(this.actionStatus === SystemActionStatus.IN_PROGRESS)
		{
			Logger.error('System action already in progress');
			callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			return;
		}
		
		this.actionStatus = SystemActionStatus.IN_PROGRESS;
		
		if(action === 'update-system')
		{
			Logger.info('Starting system update...');
			this.updateSystem().then(() =>
			{
				this.actionStatus = SystemActionStatus.COMPLETED;
				Logger.info('System update completed successfully');
				callback(this.Bleno.Characteristic.RESULT_SUCCESS);
			})
			.catch(error =>
			{
				this.actionStatus = SystemActionStatus.ERROR;
				Logger.error(`Error updating system: ${error}`);
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			});
		}
		else if(action === 'reset')
		{
			Logger.info('Starting system reset...');
			this.resetSystem().then(() =>
			{
				this.actionStatus = SystemActionStatus.COMPLETED;
				Logger.info('System reset completed successfully.');
				callback(this.Bleno.Characteristic.RESULT_SUCCESS);
				// Shutdown the application (Restart performed by systemd) in 1 second
				setTimeout(() => {
					process.exit(0);
				}, 1000);
			})
			.catch(error =>
			{
				this.actionStatus = SystemActionStatus.ERROR;
				Logger.error(`Error resetting system: ${error}`);
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			});
		}
		else if(action === 'reboot')
		{
			// Send callback before rebooting the system
			callback(this.Bleno.Characteristic.RESULT_SUCCESS);
			Logger.info('Rebooting system...');
			this.rebootSystem().then(() =>
			{
				this.actionStatus = SystemActionStatus.COMPLETED;
				Logger.info('System is rebooting...');
			})
			.catch(error =>
			{
				this.actionStatus = SystemActionStatus.ERROR;
				Logger.error(`Error rebooting system: ${error}`);
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			});
		}
		else if(action === 'halt')
		{
			// Send callback before shutting down the system
			callback(this.Bleno.Characteristic.RESULT_SUCCESS);
			Logger.info('Shutting down system...');
			this.shutdownSystem().then(() =>
			{
				this.actionStatus = SystemActionStatus.COMPLETED;
				Logger.info('System is shutting down...');
			})
			.catch(error =>
			{
				this.actionStatus = SystemActionStatus.ERROR;
				Logger.error(`Error shutting down system: ${error}`);
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			});
		}
		else
		{
			Logger.info(`System action "${action}" received is unknown.`);
			this.actionStatus = SystemActionStatus.ERROR;
			callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
		}
	}
	
	/**
	 * Promise-based function to update the system
	 * @returns Promise<void>
	 */
	private updateSystem(): Promise<void>
	{
		return new Promise(async (resolve, reject) =>
		{
			try
			{
				// Pull the Docker image using imagePull from docker utils
				Logger.info('Pulling the Casanode Docker image...');
				const pullResult = await imagePull();
				// Check if the image was pulled successfully
				if (pullResult)
				{
					Logger.info('Casanode Docker image pulled successfully');
				}
				else
				{
					Logger.error('Failed to pull the Casanode Docker image');
					reject('Failed to pull the Casanode Docker image');
					return;
				}
				
				// Execute system update commands here
				exec('sudo apt update && sudo apt upgrade -y', (error, stdout, stderr) =>
				{
					if (error)
					{
						Logger.error(`Error updating system: ${error}`);
						reject(error);
					}
					else
					{
						Logger.info('System update command executed successfully');
						resolve();
					}
				});
			}
			catch (error)
			{
				Logger.error(`Error updating system: ${error}`);
				reject(error);
			}
		});
	}
	
	/**
	 * Promise-based function to reset the system
	 * @returns Promise<void>
	 */
	private resetSystem(): Promise<void>
	{
		return new Promise(async (resolve, reject) =>
		{
			try
			{
				// Stop Docker container
				Logger.info('Stopping Casanode Docker container...');
				const stopResult = await containerStop();
				if (!stopResult)
				{
					Logger.error('Failed to stop Casanode Docker container.');
					reject('Failed to stop Casanode Docker container.');
					return;
				}
				
				// Remove container
				Logger.info('Removing Casanode Docker container...');
				const containerRemoveResult = await containerRemove();
				if (!containerRemoveResult)
				{
					Logger.error('Failed to remove Casanode Docker container.');
					reject('Failed to remove Casanode Docker container.');
					return;
				}
				
				// Get wallet passphrase
				const passphrase = nodeManager.getConfig().walletPassphrase;
				
				// Check if the wallet exists
				Logger.info('Checking if the wallet exists...');
				const walletExistsResult = await nodeManager.walletExists(passphrase);
				
				// If the wallet exists
				if (walletExistsResult)
				{
					// Remove Wallet
					Logger.info('Removing the wallet...');
					const walletRemoveResult = await nodeManager.walletRemove(passphrase);
					if (!walletRemoveResult)
					{
						Logger.error('Failed to remove the wallet.');
						reject('Failed to remove the wallet.');
						return;
					}
				}
				
				// Remove Docker images
				Logger.info('Removing all Docker images...');
				const removeImagesResult = await imagesRemove();
				if (!removeImagesResult)
				{
					Logger.error('Failed to remove all Docker images.');
					reject('Failed to remove all Docker images.');
					return;
				}
				
				// Determine user's home directory
				const userHomeDir = os.homedir();
				
				// Delete specific directory: /opt/casanode/.sentinelnode/
				const sentinelNodeDir = `${userHomeDir}/.sentinelnode`;
				Logger.info(`Deleting directory: ${sentinelNodeDir}`);
				await fs.rm(sentinelNodeDir, { recursive: true });
				
				// Reset the node configuration
				nodeManager.resetNodeConfig();
				
				// Reload remote Ip and Location
				await nodeManager.refreshNodeLocation();
				
				// Reset configuration
				resetConfiguration();
				
				// Resolve the promise when all operations are completed successfully
				resolve();
			}
			catch (error)
			{
				Logger.error(`Error resetting system: ${error}`);
				reject(error);
			}
		});
	}
	
	/**
	 * Promise-based function to shut down the system
	 * @returns Promise<void>
	 */
	private shutdownSystem(): Promise<void>
	{
		return new Promise((resolve, reject) =>
		{
			exec('sudo shutdown -h now', (error, stdout, stderr) =>
			{
				if (error)
					reject(`Error shutting down system: ${error.message}`);
				else
					resolve();
			});
		});
	}
	
	/**
	 * Promise-based function to reboot the system
	 * @returns Promise<void>
	 */
	private rebootSystem(): Promise<void>
	{
		return new Promise((resolve, reject) =>
		{
			exec('sudo shutdown -r now', (error, stdout, stderr) =>
			{
				if (error)
					reject(`Error rebooting system: ${error.message}`);
				else
					resolve();
			});
		});
	}
}
