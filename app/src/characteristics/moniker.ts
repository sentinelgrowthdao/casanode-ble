import { createRequire } from 'module';

import { Logger } from '@utils/logger';
import nodeManager from '@utils/node';

export class MonikerCharacteristic
{
	/**
	 * Bleno instance
	 * @type any
	 */
	private Bleno: any = undefined;
	
	/**
	 * Create a new instance of Characteristic
	 */
	constructor(private characteristicUuid: string) 
	{
		const require = createRequire(import.meta.url);
		this.Bleno = require('bleno');
	}
	
	/**
	 * Create a new instance of MonikerCharacteristic
	 * @param uuid - UUID of the characteristic
	 */
	public create(uuid: string)//: typeof Bleno.Characteristic 
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
		const value = nodeManager.getConfig().moniker;
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
		
		// Check if the value is too short
		if (value.length <= 8) 
		{
			Logger.error('MonikerCharacteristic - onWriteRequest: value is too short');
			// callback(this.Bleno.Characteristic.RESULT_ATTR_NOT_LONG);
			callback(this.Bleno.Characteristic.RESULT_INVALID_ATTRIBUTE_LENGTH);
			// callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			return;
		}
		
		// Set the value in the configuration
		nodeManager.setMoniker(value);
		
		// Notify the subscriber if the value is set
		callback(this.Bleno.Characteristic.RESULT_SUCCESS);
		Logger.info('MonikerCharacteristic - onWriteRequest: value = ' + value);
	}
}
