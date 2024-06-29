import { createRequire } from 'module';
import { exec } from 'child_process';
import * as os from 'os';
import * as fs from 'fs/promises';

import { Logger } from '@utils/logger';
import { imagePull, containerStop, imagesRemove, containerRemove } from '@utils/docker';
import nodeManager from '@utils/node';


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
	 * Create a new instance of Characteristic
	 */
	constructor(private uuid: string) 
	{
		const require = createRequire(import.meta.url);
		this.Bleno = require('bleno');
		this.characteristicUuid = uuid;
	}
	
	/**
	 * Create a new instance of NodePortCharacteristic
	 */
	public create()//: typeof Bleno.Characteristic 
	{
		if(this.Bleno === undefined)
			return null;
		
		return new this.Bleno.Characteristic({
			uuid: this.characteristicUuid,
			properties: ['write'],
			onWriteRequest: this.onWriteRequest.bind(this),
		});
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
		// Get the value from the buffer
		const action = data.toString('utf-8').trim();
		
		if(action === 'update')
		{
			this.updateSystem().then(() =>
			{
				Logger.info('System update completed successfully');
				callback(this.Bleno.Characteristic.RESULT_SUCCESS);
			})
			.catch(error =>
			{
				Logger.error(`Error updating system: ${error}`);
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			});
		}
		else if(action === 'reset')
		{
			this.resetSystem().then(() =>
			{
				Logger.info('System reset completed successfully.');
				callback(this.Bleno.Characteristic.RESULT_SUCCESS);
			})
			.catch(error =>
			{
				Logger.error(`Error resetting system: ${error}`);
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			});
		}
		else if(action === 'reboot')
		{
			this.rebootSystem().then(() =>
			{
				Logger.info('System is rebooting...');
				callback(this.Bleno.Characteristic.RESULT_SUCCESS);
			})
			.catch(error =>
			{
				Logger.error(`Error rebooting system: ${error}`);
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			});
		}
		else if(action === 'halt')
		{
			this.shutdownSystem().then(() =>
			{
				Logger.info('System is shutting down...');
				callback(this.Bleno.Characteristic.RESULT_SUCCESS);
			})
			.catch(error =>
			{
				Logger.error(`Error shutting down system: ${error}`);
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			});
		}
		else
		{
			Logger.info(`System action "${action}" received is unknown.`);
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
				
				// Delete specific directory: /home/raspberry/.sentinelnode/
				const sentinelNodeDir = `${userHomeDir}/.sentinelnode`;
				Logger.info(`Deleting directory: ${sentinelNodeDir}`);
				await fs.rm(sentinelNodeDir, { recursive: true });
				
				// Reset the node configuration
				nodeManager.resetNodeConfig();
				
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
