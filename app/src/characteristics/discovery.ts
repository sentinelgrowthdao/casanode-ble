import { createRequire } from 'module';

import { Logger } from '@utils/logger';
import config from '@utils/configuration';
import { getLocalIPAddress } from '@utils/network';

export class DiscoveryCharacteristic
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
	 * Create a new instance of MonikerCharacteristic
	 */
	public create()//: typeof Bleno.Characteristic 
	{
		if(this.Bleno === undefined)
			return null;
		
		return new this.Bleno.Characteristic({
			uuid: this.characteristicUuid,
			properties: ['read', 'write'],
			onReadRequest: this.onReadRequest.bind(this),
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
		// Get local IP address
		const localIPAddress = getLocalIPAddress();
		// Get the port from the configuration
		const localWebPort = config.WEB_LISTEN.split(':')[1] || 8080;
		// Log the request
		Logger.info(`Request for discovery: Sending local IP address and port to client: ${localIPAddress}:${localWebPort}`);
		// Return the value to the subscriber
		callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(`${localIPAddress}:${localWebPort}`));
	}
	
}
