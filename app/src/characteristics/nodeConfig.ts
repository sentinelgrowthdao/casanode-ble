import { createRequire } from 'module';

import { Logger } from '@utils/logger';
import nodeManager, { NodeConfigData } from '@utils/node';

export class NodeConfigCharacteristic
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
	constructor(uuid: string) 
	{
		const require = createRequire(import.meta.url);
		this.Bleno = require('bleno');
		this.characteristicUuid = uuid;
	}
	
	/**
	 * Create a new instance of NodeConfigCharacteristic
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
		const value = data.toString('utf-8').trim();
		
		// Check if the value is invalid
		if (value !== 'apply') 
		{
			Logger.error('Invalid value received via Bluetooth for "moniker".');
			callback(this.Bleno.Characteristic.RESULT_INVALID_ATTRIBUTE_LENGTH);
			return;
		}
		
		// Update the configuration
		nodeManager.refreshConfigFiles();
		
		// Notify the subscriber if the value is set
		callback(this.Bleno.Characteristic.RESULT_SUCCESS);
		Logger.info(`Parameter "moniker" updated via Bluetooth to: ${value}`);
	}
}
