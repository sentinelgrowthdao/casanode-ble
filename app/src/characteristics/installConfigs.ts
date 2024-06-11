import { createRequire } from 'module';

import { Logger } from '@utils/logger';
import {
	createNodeConfig,
	createVpnConfig,
} from '@utils/node';

export class InstallConfigsCharacteristic
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
	 * Create a new instance of InstallConfigsCharacteristic
	 */
	public create()//: typeof Bleno.Characteristic 
	{
		if(this.Bleno === undefined)
			return null;
		
		return new this.Bleno.Characteristic({
			uuid: this.characteristicUuid,
			properties: ['read'],
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
		// Create the node configuration
		createNodeConfig().then((statusNode: boolean) =>
		{
			// Create the VPN configuration
			createVpnConfig().then((statusVpn: boolean) =>
			{
				// Combine the status of the node and VPN
				let status = statusNode ? '1' : '0';
				status += statusVpn ? '1' : '0';
				// Return the value to the subscriber
				callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(status));
			}).catch((error: any) => {
				Logger.error(`Error while creating the VPN configuration: ${error}`);
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR, Buffer.from((statusNode ? '1' : '0')+'0'));
			});
		}).catch((error: any) => {
			Logger.error(`Error while creating the node configuration: ${error}`);
			callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR, Buffer.from('00'));
		});
	}
}
