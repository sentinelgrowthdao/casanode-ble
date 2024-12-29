import { createRequire } from 'module';

import { Logger } from '@utils/logger';
import {
	vpnChangeType,
} from '@utils/node';

export class VpnChangeTypeCharacteristic
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
	 * Create a new instance of VpnChangeTypeCharacteristic
	 */
	public create()//: typeof Bleno.Characteristic
	{
		if (this.Bleno === undefined)
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
		// Create the VPN configuration
		vpnChangeType().then((statusVpn: boolean) =>
		{
			Logger.info(`VPN configuration file created: ${statusVpn}`);
			callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from('0'));
			return null;
		})
			.catch ((error: any) =>
			{
				Logger.error(`Error while creating the VPN configuration: ${error}`);
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR, Buffer.from('1'));
				return null;
			});
	}
}
