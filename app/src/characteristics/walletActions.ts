import { createRequire } from 'module';

import { Logger } from '@utils/logger';
import nodeManager from '@utils/node';
import { walletExists, walletCreate, walletRemove, walletRecover } from '@utils/node';

export class WalletActionsCharacteristic
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
	 * Create a new instance of NodeLocationCharacteristic
	 */
	public create()//: typeof Bleno.Characteristic 
	{
		if(this.Bleno === undefined)
			return null;
		
		return new this.Bleno.Characteristic({
			uuid: this.characteristicUuid,
			properties: ['write'],
			onWriteRequest: this.onWriteRequest.bind(this),
		});
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
		// Get the value from the buffer
		const value = data.toString('utf-8').trim();
		
		// Check if the value is invalid
		if (value !== 'create' && value !== 'remove' && value !== 'restore') 
		{
			Logger.error('Invalid value for wallet action');
			callback(this.Bleno.Characteristic.RESULT_INVALID_ATTRIBUTE_LENGTH);
			return;
		}
		
		// Get wallet passphrase
		const passphrase = nodeManager.getConfig().walletPassphrase;
		
		// If request is to create a new wallet
		if (value === 'create') 
		{
			// Check if the wallet already exists
			walletExists(passphrase).then((exists) =>
			{
				// Skip if wallet already exists
				if(exists) 
				{
					Logger.error('Wallet already exists');
					callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
				}
				else
				{
					// Create the wallet
					walletCreate(passphrase).then((mnemonic: string[] | null | undefined) =>
					{
						// If an error occurred while creating the wallet
						if(typeof mnemonic === 'undefined' || mnemonic === null)
						{
							Logger.error('Error creating wallet');
							callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
							return;
						}
						
						// Set the mnemonic in the configuration
						nodeManager.setMnemonic(mnemonic);
						
						Logger.info('Wallet created successfully');
						callback(this.Bleno.Characteristic.RESULT_SUCCESS);
					}).catch((error) => {
						Logger.error('Error creating wallet');
						callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
					});
				}
			})
			.catch((error) => {
				Logger.error('Error checking wallet existence');
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			});
		}
		// If request is to remove the wallet
		else if (value === 'remove')
		{
			// Check if the wallet already exists
			walletExists(passphrase).then((exists) =>
			{
				// If wallet exists
				if(exists) 
				{
					// Remove the wallet
					walletRemove(passphrase).then(() =>
					{
						Logger.info('Wallet removed successfully');
						callback(this.Bleno.Characteristic.RESULT_SUCCESS);
					})
					.catch((error) => {
						Logger.error('Error removing wallet');
						callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
					});
				}
				else
				{
					Logger.error('Wallet does not exist');
					callback(this.Bleno.Characteristic.RESULT_SUCCESS);
				}
			})
			.catch((error) => {
				Logger.error('Error checking wallet existence');
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			});
		}
		// If request is to recover an existing wallet
		else if (value === 'restore') 
		{
			// Check if the wallet already exists
			walletExists(passphrase).then((exists) =>
			{
				// Skip if wallet already exists
				if(exists) 
				{
					Logger.error('Wallet already exists');
					callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
				}
				else
				{
					// Get wallet mnemonic
					const mnemonic = nodeManager.getConfig().walletMnemonic;
					
					// Recover the wallet
					walletRecover(mnemonic, passphrase).then((recover: boolean | undefined) =>
					{
						// If an error occurred while creating the wallet
						if(typeof mnemonic === 'undefined')
						{
							Logger.error('Error recovering wallet');
							callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
							return;
						}
						
						Logger.info('Wallet recovered successfully');
						callback(this.Bleno.Characteristic.RESULT_SUCCESS);
					}).catch((error) => {
						Logger.error('Error creating wallet');
						callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
					});
				}
			})
			.catch((error) => {
				Logger.error('Error checking wallet existence');
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			});
		}
		
	}
}
