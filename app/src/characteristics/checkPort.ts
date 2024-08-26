import { createRequire } from 'module';
import { Logger } from '@utils/logger';
import axios from 'axios';
import config from '@utils/configuration';
import { nodeConfig } from '@utils/node';

enum PortCheckStatus {
	NOT_STARTED = 0,
	IN_PROGRESS = 1,
	OPEN = 2,
	CLOSED = 3,
	ERROR = -1
}

export class CheckPortCharacteristic
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
	 * Port check status
	 * @type PortCheckStatus
	 */
	private portCheckStatus: PortCheckStatus = PortCheckStatus.NOT_STARTED;
	
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
	 * Create a new instance of CheckPortCharacteristic
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
		switch(this.portCheckStatus)
		{
			case PortCheckStatus.NOT_STARTED: response = '0'; break;
			case PortCheckStatus.IN_PROGRESS: response = '1'; break;
			case PortCheckStatus.OPEN: response = '2'; break;
			case PortCheckStatus.CLOSED: response = '3'; break;
			case PortCheckStatus.ERROR: response = '-1'; break;
		}
		
		Logger.info(`Port check status: ${response}`);
		callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(response));
	}
	
	/**
	 * Start the port check process with a write request
	 * @param data Buffer
	 * @param offset number
	 * @param withoutResponse boolean
	 * @param callback (result: number) => void
	 * @returns void
	 */
	public onWriteRequest(data: Buffer, offset: number, withoutResponse: boolean, callback: (result: number) => void)
	{
		const configData = nodeConfig();
		const requestedPort = data.toString('utf8').toLowerCase().trim(); // 'node' or 'vpn'
		let portToCheck: number;
		
		// Determine which port to check
		if (requestedPort === 'node') 
		{
			portToCheck = configData.node_port;
		} 
		else if (requestedPort === 'vpn') 
		{
			portToCheck = configData.vpn_port;
		} 
		else 
		{
			Logger.error('Invalid port type requested');
			callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			return;
		}
		
		// Check if the port check is already in progress
		if(this.portCheckStatus === PortCheckStatus.IN_PROGRESS)
		{
			Logger.error('Port check already in progress');
			callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			return;
		}
		
		// Url to check the port
		const checkUrl = `${config.FOXINODES_API_CHECK_PORT}${configData.node_ip}:${portToCheck}`;
		
		// Start the port check process
		this.portCheckStatus = PortCheckStatus.IN_PROGRESS;
		callback(this.Bleno.Characteristic.RESULT_SUCCESS);
		
		Logger.info(`Starting port check on ${configData.node_ip}:${portToCheck} (${checkUrl})`);
		
		// Send the request to the API
		axios.get(checkUrl, { timeout: 60000 })
		.then((response) =>
		{
			Logger.info(`Port check response received`);
			// Check the response
			if (response.data?.error === false && response.data?.node?.success === true) 
				this.portCheckStatus = PortCheckStatus.OPEN;
			else 
				this.portCheckStatus = PortCheckStatus.CLOSED;
		})
		.catch((error) =>
		{
			Logger.error(`Error while checking port: ${error}`);
			this.portCheckStatus = PortCheckStatus.ERROR;
		});
	}
}
