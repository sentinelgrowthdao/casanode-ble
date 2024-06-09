import { createRequire } from 'module';

import { Logger } from '@utils/logger';
import nodeManager from '@utils/node';
import { walletLoadAddresses } from '@utils/node';

export class PublicAddressCharacteristic
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
	 * Create a new instance of PublicAddressCharacteristic
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
		// Get the value from the configuration
		const address = nodeManager.getConfig().walletPublicAddress;
		// If address is empty
		if(address === '')
		{
			// If the passphrase is unavailable
			if(!nodeManager.passphraseAvailable())
			{
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR, Buffer.from(''));
				return true;
			}
			
			// Get the wallet passphrase stored in the configuration
			const passphrase = nodeManager.getConfig().walletPassphrase;
			// Load wallet informations
			walletLoadAddresses(passphrase).then(() =>
			{
				// Get the value from the configuration
				const address = nodeManager.getConfig().walletPublicAddress;
				// Return the value to the subscriber
				callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(address));
			}).catch((error: any) => {
				Logger.error(`Error while loading the wallet addresses: ${error}`);
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR, Buffer.from(''));
			});
		}
		else
		{
			// Return the value to the subscriber
			callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(address));
		}
	}
}
