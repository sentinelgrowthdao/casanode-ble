import { createRequire } from 'module';

import { Logger } from '@utils/logger';
import nodeManager from '@utils/node';
import { type NodeConfigData } from '@utils/node';

export class NodeKeyringBackendCharacteristic
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
	 * Create a new instance of NodePassphraseCharacteristic
	 */
	public create()//: typeof Bleno.Characteristic
	{
		if (this.Bleno === undefined)
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
		const nodeConfig: NodeConfigData = nodeManager.getConfig();
		// Return the value to the subscriber
		callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(nodeConfig.backend));
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
		
		// Check if the value is valid
		if (value !== 'test' && value !== 'file')
		{
			Logger.error('Invalid value received via Bluetooth for "backend".');
			callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			return;
		}
		
		// Set the value in the configuration
		nodeManager.setBackend(value);
		
		// Notify the subscriber if the value is set
		callback(this.Bleno.Characteristic.RESULT_SUCCESS);
		Logger.info(`Parameter "backend" updated via Bluetooth to: ${value}`);
	}
}
