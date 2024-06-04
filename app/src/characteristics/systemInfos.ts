import { createRequire } from 'module';

import nodeManager from '@utils/node';

export class SystemInfosCharacteristic
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
	 * Create a new instance of SystemInfosCharacteristic
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
		const info = {
			casanodeVersion: '1.0.0',
			systemOs: nodeManager.getConfig().systemOs,
			systemKernel: nodeManager.getConfig().systemKernel,
			systemArch: nodeManager.getConfig().systemArch,
		};
		// Return the value to the subscriber
		callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(JSON.stringify(info)));
	}
}
