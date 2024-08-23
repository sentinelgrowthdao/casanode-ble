import { createRequire } from 'module';

import { Logger } from '@utils/logger';
import nodeManager from '@utils/node';
import { isValidIP, isValidDns } from '@utils/validators';

export class NodeIpCharacteristic
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
	 * Create a new instance of NodeIpCharacteristic
	 */
	public create()//: typeof Bleno.Characteristic 
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
		// Get the value from the configuration
		const value = nodeManager.getConfig().node_ip;
		// Return the value to the subscriber
		callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(value));
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
		const value = data.toString('utf-8').trim();
		
		// Check if the value is a valid IP
		if (isValidIP(value))
		{
			// Set the value in the configuration immediately
			nodeManager.setNodeIp(value);
			
			// Notify the subscriber of success
			callback(this.Bleno.Characteristic.RESULT_SUCCESS);
			Logger.info(`Parameter "node_ip" updated via Bluetooth to: ${value}`);
		}
		else
		{
			// Check if the value is a valid DNS asynchronously
			isValidDns(value).then(isValid => 
			{
				if (isValid)
				{
					// If valid DNS, set the value in the configuration
					nodeManager.setNodeIp(value);
					
					// Notify the subscriber of success
					callback(this.Bleno.Characteristic.RESULT_SUCCESS);
					Logger.info(`Parameter "node_ip" updated via Bluetooth to: ${value}`);
				}
				else
				{
					// If invalid, return an error
					Logger.error('Invalid value received via Bluetooth for "node_ip".');
					callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
				}
			}).catch((error: any) => 
			{
				// Handle any errors that occur during DNS resolution
				Logger.error(`Error while resolving DNS: ${error}`);
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			});
		}
	}
}
