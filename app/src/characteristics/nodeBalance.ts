import { createRequire } from 'module';

import { Logger } from '@utils/logger';
import nodeManager from '@utils/node';
import { walletBalance } from '@utils/node';

export class NodeBalanceCharacteristic
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
	 * Create a new instance of NodeBalanceCharacteristic
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
		const publicAddress = nodeManager.getConfig().walletPublicAddress;
		// If the wallet public address is unavailable
		if(publicAddress === '')
		{
			callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from('0 DVPN'));
			return;
		}
		
		// Get the wallet balance
		walletBalance(publicAddress).then((balance) =>
		{
			// Get the value from the configuration
			const value = `${balance.amount} ${balance.denom}`;
			// Return the value to the subscriber
			callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(value));
		}).catch((error) =>
		{
			Logger.error(`Error while getting the wallet balance: ${error}`);
			callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR, Buffer.from('0 DVPN'));
		});
	}
}
