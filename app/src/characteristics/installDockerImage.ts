import { createRequire } from 'module';

import { Logger } from '@utils/logger';
import { imagePull } from '@utils/docker';

enum InstallStatus {
	NOT_STARTED = 0,
	IN_PROGRESS = 1,
	COMPLETED = 2,
	ERROR = -1
}

export class InstallDockerImageCharacteristic
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
	 * Installation status
	 * @type InstallStatus
	 */
	private installStatus: InstallStatus = InstallStatus.NOT_STARTED;
	
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
	 * Create a new instance of InstallDockerImageCharacteristic
	 */
	public create()//: typeof Bleno.Characteristic 
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
		switch(this.installStatus)
		{
			case InstallStatus.NOT_STARTED: response = '0'; break;
			case InstallStatus.IN_PROGRESS: response = '1'; break;
			case InstallStatus.COMPLETED: response = '2'; break;
			case InstallStatus.ERROR: response = '-1'; break;
		}
		
		Logger.info(`Install Docker Image status: ${response}`);
		callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(response));
	}
	
	// Start the installation process with a write request
	public onWriteRequest(data: Buffer, offset: number, withoutResponse: boolean, callback: (result: number) => void)
	{
		if(this.installStatus === InstallStatus.IN_PROGRESS)
		{
			Logger.error('Installation already in progress');
			callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			return;
		}
		
		// Start the installation process
		this.installStatus = InstallStatus.IN_PROGRESS;
		// Send a response to the client
		callback(this.Bleno.Characteristic.RESULT_SUCCESS);
		
		Logger.info('Starting Docker image installation');
		// Start the installation process
		imagePull()
		.then((status: boolean) =>
		{
			Logger.info(`Docker installation status: ${status}`);
			this.installStatus = status ? InstallStatus.COMPLETED : InstallStatus.ERROR;
		})
		.catch((error: any) =>
		{
			Logger.error(`Error while installing Docker image: ${error}`);
			this.installStatus = InstallStatus.ERROR;
		});
	}
}
