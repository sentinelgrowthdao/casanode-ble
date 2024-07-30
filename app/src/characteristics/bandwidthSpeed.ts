import { createRequire } from 'module';

import { Logger } from '@utils/logger';
import nodeManager from '@utils/node';
import { type NodeStatus } from '@utils/node';

export class BandwidthSpeedCharacteristic
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
	 * Create a new instance of BandwidthSpeedCharacteristic
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
		let info = {
			d: -1,
			u: -1,
		};
		
		// Get the status of the node
		nodeManager.getNodeStatus().then((data: NodeStatus|null) =>
		{
			// Set the download and upload speed
			info.d = data?.bandwidth?.download ? data.bandwidth.download : -1;
			info.u = data?.bandwidth?.upload ? data.bandwidth.upload : -1;
			// Return the value to the subscriber
			callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(JSON.stringify(info)));
		})
		.catch((error: any) =>
		{
			Logger.error(`Error while reading the node status: ${error}`);
			callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(JSON.stringify(info)));
		});
		
	}
}
