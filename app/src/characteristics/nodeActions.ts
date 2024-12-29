import { createRequire } from 'module';

import { Logger } from '@utils/logger';
import {
	containerStart,
	containerStop,
	containerRestart,
	containerRemove,
} from '@utils/docker';

export class NodeActionsCharacteristic
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
		if (this.Bleno === undefined)
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
		
		if (action === 'start')
		{
			Logger.info('Starting the container...');
			// Start the container
			containerStart().then(() =>
			{
				Logger.info('Container started successfully');
				callback(this.Bleno.Characteristic.RESULT_SUCCESS);
				return null;
			})
				.catch ((error) =>
				{
					Logger.error(`Error starting the container: ${error}`);
					callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
					return null;
				});
		}
		else if (action === 'stop')
		{
			Logger.info('Stopping the container...');
			// Stop the container
			containerStop().then(() =>
			{
				Logger.info('Container stopped successfully');
				callback(this.Bleno.Characteristic.RESULT_SUCCESS);
				return null;
			})
				.catch ((error) =>
				{
					Logger.error(`Error stopping the container: ${error}`);
					callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
					return null;
				});
		}
		else if (action === 'restart')
		{
			Logger.info('Restarting the container...');
			// Restart the container
			containerRestart().then(() =>
			{
				Logger.info('Container restarted successfully');
				callback(this.Bleno.Characteristic.RESULT_SUCCESS);
				return null;
			})
				.catch ((error) =>
				{
					Logger.error(`Error restarting the container: ${error}`);
					callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
					return null;
				});
		}
		else if (action === 'remove')
		{
			Logger.info('Removing the container...');
			// Remove the container
			containerRemove().then(() =>
			{
				Logger.info('Container removed successfully');
				callback(this.Bleno.Characteristic.RESULT_SUCCESS);
				return null;
			})
				.catch ((error) =>
				{
					Logger.error(`Error removing the container: ${error}`);
					callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
					return null;
				});
		}
		else
		{
			Logger.info(`Node action "${action}" received is unknown.`);
			callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
		}
	}
	
}
