import { createRequire } from 'module';

import { Logger } from '@utils/logger';
import nodeManager from '@utils/node';
import { checkInstallation, type InstallationCheck } from '@actions/index';

export class CheckInstallationCharacteristic
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
	 * Create a new instance of CheckInstallationCharacteristic
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
		
		checkInstallation().then((status: InstallationCheck) =>
		{
			// Create a result string
			let result = status.image ? '1' : '0';
			result += status.containerExists ? '1' : '0';
			result += status.nodeConfig ? '1' : '0';
			result += status.vpnConfig ? '1' : '0';
			result += status.certificateKey ? '1' : '0';
			result += status.wallet ? '1' : '0';
			
			// Return the value to the subscriber
			callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(result));
		}).catch((error: any) => {
			Logger.error(`Error while reading the installation status: ${error}`);
			callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR, Buffer.from('unknown'));
		});
	}
}
