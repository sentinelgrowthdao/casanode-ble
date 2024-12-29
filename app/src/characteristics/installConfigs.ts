import { createRequire } from 'module';

import { Logger } from '@utils/logger';
import {
	createNodeConfig,
	createVpnConfig,
} from '@utils/node';
import { certificateGenerate } from '@utils/certificate';

enum ConfigStatus {
	NOT_STARTED = 0,
	IN_PROGRESS = 1,
	COMPLETED = 2,
	ERROR = -1
}

export class InstallConfigsCharacteristic
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
	 * Configuration installation status
	 * @type ConfigStatus
	 */
	private configStatus: ConfigStatus = ConfigStatus.NOT_STARTED;
	
	/**
	 * Status summary of node, VPN, and certificate generation
	 * @type string
	 */
	private statusSummary: string = '000'; // Default: Node(0), VPN(0), Cert(0)
	
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
	 * Create a new instance of InstallConfigsCharacteristic
	 */
	public create()
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
		let response;
		switch (this.configStatus)
		{
			case ConfigStatus.NOT_STARTED:
				response = '0';
				break;
			case ConfigStatus.IN_PROGRESS:
				response = '1';
				break;
			case ConfigStatus.ERROR:
				response = '-1';
				break;
			case ConfigStatus.COMPLETED:
				response = this.statusSummary;
				break;
		}
		
		Logger.info(`Configuration status: ${response}`);
		callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(response));
	}
	
	/**
	 * Called when the characteristic is written to start the configuration installation process
	 * @param data Buffer
	 * @param offset number
	 * @param withoutResponse boolean
	 * @param callback (result: number) => void
	 * @returns void
	 */
	public onWriteRequest(data: Buffer, offset: number, withoutResponse: boolean, callback: (result: number) => void)
	{
		if (this.configStatus === ConfigStatus.IN_PROGRESS)
		{
			Logger.error('Configuration installation already in progress');
			callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			return;
		}
		
		this.configStatus = ConfigStatus.IN_PROGRESS;
		callback(this.Bleno.Characteristic.RESULT_SUCCESS);
		
		Logger.info('Starting configuration installation process');
		
		// Start creating the node configuration
		createNodeConfig().then((statusNode: boolean) =>
		{
			this.statusSummary = statusNode ? '1' : '0';
			
			// Start creating the VPN configuration
			return createVpnConfig();
		})
			.then((statusVpn: boolean) =>
			{
				this.statusSummary += statusVpn ? '1' : '0';
				
				// Start generating the certificate
				return certificateGenerate();
			})
			.then((certSuccess: boolean) =>
			{
				this.statusSummary += certSuccess ? '1' : '0';
				this.configStatus = ConfigStatus.COMPLETED;
				Logger.info(`Configuration installation completed with status: ${this.statusSummary}`);
				return null;
			})
			.catch ((error: any) =>
			{
				this.configStatus = ConfigStatus.ERROR;
				Logger.error(`Error during configuration installation: ${error}`);
				return null;
			});
	}
}
