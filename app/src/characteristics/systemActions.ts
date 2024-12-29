import { createRequire } from 'module';
import { Logger } from '@utils/logger';
import { refreshNetworkConfiguration } from '@utils/configuration';
import {
	updateSystem,
	resetSystem,
	rebootSystem,
	shutdownSystem,
} from '@utils/system';

enum SystemActionStatus
{
	NOT_STARTED = 0,
	IN_PROGRESS = 1,
	COMPLETED = 2,
	ERROR = -1
}

export class SystemActionsCharacteristic
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
	 * System action status
	 * @type SystemActionStatus
	 */
	private actionStatus: SystemActionStatus = SystemActionStatus.NOT_STARTED;
	
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
	 * Create a new instance of SystemActionsCharacteristic
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
		switch (this.actionStatus)
		{
			case SystemActionStatus.NOT_STARTED:
				response = '0';
				break;
			case SystemActionStatus.IN_PROGRESS:
				response = '1';
				break;
			case SystemActionStatus.COMPLETED:
				response = '2';
				break;
			case SystemActionStatus.ERROR:
				response = '-1';
				break;
			default:
				response = '0';
				break;
		}
		
		Logger.info(`System action status: ${response}`);
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
		const action = data.toString('utf-8').trim();
		
		if (this.actionStatus === SystemActionStatus.IN_PROGRESS)
		{
			Logger.error('System action already in progress');
			callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			return;
		}
		
		this.actionStatus = SystemActionStatus.IN_PROGRESS;
		
		if (action === 'update-system')
		{
			Logger.info('Starting system update...');
			updateSystem().then(() =>
			{
				this.actionStatus = SystemActionStatus.COMPLETED;
				Logger.info('System update completed successfully');
				callback(this.Bleno.Characteristic.RESULT_SUCCESS);
				return null;
			})
				.catch ((error) =>
				{
					this.actionStatus = SystemActionStatus.ERROR;
					Logger.error(`Error updating system: ${error}`);
					callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
					return null;
				});
		}
		else if (action === 'update-sentinel')
		{
			Logger.info('Starting Sentinel update...');
			// Update Sentinel
			refreshNetworkConfiguration().then(() =>
			{
				this.actionStatus = SystemActionStatus.COMPLETED;
				Logger.info('Sentinel update completed successfully');
				callback(this.Bleno.Characteristic.RESULT_SUCCESS);
				return null;
			})
				.catch ((error) =>
				{
					this.actionStatus = SystemActionStatus.ERROR;
					Logger.error(`Error updating Sentinel: ${error}`);
					callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
					return null;
				});
		}
		else if (action === 'reset')
		{
			Logger.info('Starting system reset...');
			resetSystem().then(() =>
			{
				this.actionStatus = SystemActionStatus.COMPLETED;
				Logger.info('System reset completed successfully.');
				callback(this.Bleno.Characteristic.RESULT_SUCCESS);
				// Shutdown the application (Restart performed by systemd) in 1 second
				setTimeout(() =>
				{
					process.exit(0);
				}, 1000);
				return null;
			})
				.catch ((error) =>
				{
					this.actionStatus = SystemActionStatus.ERROR;
					Logger.error(`Error resetting system: ${error}`);
					callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
					return null;
				});
		}
		else if (action === 'reboot')
		{
			// Send callback before rebooting the system
			callback(this.Bleno.Characteristic.RESULT_SUCCESS);
			Logger.info('Rebooting system...');
			rebootSystem().then(() =>
			{
				this.actionStatus = SystemActionStatus.COMPLETED;
				Logger.info('System is rebooting...');
				return null;
			})
				.catch ((error) =>
				{
					this.actionStatus = SystemActionStatus.ERROR;
					Logger.error(`Error rebooting system: ${error}`);
					callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
					return null;
				});
		}
		else if (action === 'halt')
		{
			// Send callback before shutting down the system
			callback(this.Bleno.Characteristic.RESULT_SUCCESS);
			Logger.info('Shutting down system...');
			shutdownSystem().then(() =>
			{
				this.actionStatus = SystemActionStatus.COMPLETED;
				Logger.info('System is shutting down...');
				return null;
			})
				.catch ((error) =>
				{
					this.actionStatus = SystemActionStatus.ERROR;
					Logger.error(`Error shutting down system: ${error}`);
					callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
					return null;
				});
		}
		else
		{
			Logger.info(`System action "${action}" received is unknown.`);
			this.actionStatus = SystemActionStatus.ERROR;
			callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
		}
	}
}
