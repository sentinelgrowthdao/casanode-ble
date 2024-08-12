import { createRequire } from 'module';
import { Logger } from '@utils/logger';
import { certificateGenerate } from '@utils/certificate';

enum CertificateStatus {
	NOT_STARTED = 0,
	IN_PROGRESS = 1,
	COMPLETED = 2,
	ERROR = -1
}

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
	 * Certificate renewal status
	 * @type CertificateStatus
	 */
	private certStatus: CertificateStatus = CertificateStatus.NOT_STARTED;
	
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
	 * Create a new instance of CertificateActionsCharacteristic
	 */
	public create() 
	{
		if(this.Bleno === undefined)
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
		let response;
		switch(this.certStatus)
		{
			case CertificateStatus.NOT_STARTED:
				response = '0'; 
				break;
			case CertificateStatus.IN_PROGRESS:
				response = '1'; 
				break;
			case CertificateStatus.COMPLETED:
				response = '2'; 
				break;
			case CertificateStatus.ERROR:
				response = '-1'; 
				break;
			default:
				response = '0'; 
				break;
		}
		
		Logger.info(`Certificate action status: ${response}`);
		callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(response));
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
		
		if(this.certStatus === CertificateStatus.IN_PROGRESS)
		{
			Logger.error('Certificate renewal already in progress');
			callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			return;
		}
		
		if(action === 'renew')
		{
			this.certStatus = CertificateStatus.IN_PROGRESS;
			callback(this.Bleno.Characteristic.RESULT_SUCCESS);
			
			Logger.info('Starting certificate renewal process.');
			
			certificateGenerate().then((success: boolean) =>
			{
				if(success)
				{
					this.certStatus = CertificateStatus.COMPLETED;
					Logger.info('Certificate renewed successfully.');
				}
				else
				{
					this.certStatus = CertificateStatus.ERROR;
					Logger.error('Failed to renew certificate.');
				}
			})
			.catch(error =>
			{
				this.certStatus = CertificateStatus.ERROR;
				Logger.error(`Error renewing certificate: ${error}`);
			});
		}
		else
		{
			Logger.info(`Certificate action "${action}" received is unknown.`);
			callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
		}
	}
}
