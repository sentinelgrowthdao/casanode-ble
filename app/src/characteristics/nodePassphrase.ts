import { createRequire } from 'module';

import { Logger } from '@utils/logger';
import nodeManager from '@utils/node';
import { walletUnlock } from '@utils/node';

export class NodePassphraseCharacteristic
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
		const value = nodeManager.passphraseAvailable() ? 'true' : 'false';
		// Return the value to the subscriber
		callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(value));
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
		// If passphrase is not required
		if (nodeManager.passphraseRequired() === false)
		{
			Logger.error('Passphrase is not required, but it was sent via Bluetooth.');
			callback(this.Bleno.Characteristic.RESULT_SUCCESS);
			return;
		}
		// Get the value from the buffer
		const value = data.toString('utf-8').trim();
		
		// Check if the value is valid (not empty)
		if (value.length === 0)
		{
			Logger.error('Invalid value received via Bluetooth for "passphrase".');
			callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			return;
		}
		
		// Call the async function and handle the result
		walletUnlock(value).then((canUnlockWallet) =>
		{
			// If the passphrase is invalid
			if (!canUnlockWallet)
			{
				Logger.error('Invalid passphrase received via Bluetooth for unlocking the wallet.');
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
				return;
			}
			else
			{
				// Set the value in the configuration
				nodeManager.setPassphrase(value);
				
				// Notify the subscriber if the value is set
				callback(this.Bleno.Characteristic.RESULT_SUCCESS);
				Logger.info('Parameter "passphrase" updated via Bluetooth.');
				return null;
			}
		})
			.catch ((error) =>
			{
				Logger.error(`Error in onWriteRequest: ${error.message}`);
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
				return null;
			});
	}
}
