import { createRequire } from 'module';

import { Logger } from '@utils/logger';
import nodeManager from '@utils/node';
import { type NodeStatus } from '@utils/node';

export class OnlineUsersCharacteristic
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
	 * Create a new instance of OnlineUsersCharacteristic
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
		// Get the status of the node
		nodeManager.getNodeStatus().then((data: NodeStatus|null) =>
		{
			// Return the value to the subscriber
			callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(data?.peers.toString() || '0'));
			return null;
		})
			.catch ((error: any) =>
			{
				Logger.error(`Error while reading the node status: ${error}`);
				callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from('0'));
				return null;
			});
		
	}
}
