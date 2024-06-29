import { createRequire } from 'module';
import { exec } from 'child_process';
import * as os from 'os';

import { Logger } from '@utils/logger';
import { certificateGenerate } from '@utils/certificate';

export class CertificateActionsCharacteristic
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
	 * Create a new instance of NodePortCharacteristic
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
		const action = data.toString('utf-8').trim();
		
		if(action === 'renew')
		{
			certificateGenerate().then((success: boolean) =>
			{
				if(success)
				{
					Logger.info('Certificate renewed successfully.');
					callback(this.Bleno.Characteristic.RESULT_SUCCESS);
				}
				else
				{
					Logger.error('Failed to renew certificate.');
					callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
				}
			})
			.catch(error =>
			{
				Logger.error(`Error renewing certificate and restarting Docker container: ${error}`);
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			});
		}
		else
		{
			Logger.info(`Certificate action "${action}" received is unknown.`);
			callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
		}
	}
}
