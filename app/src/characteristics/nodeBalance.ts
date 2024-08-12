import { createRequire } from 'module';
import { Logger } from '@utils/logger';
import nodeManager from '@utils/node';
import { walletBalance } from '@utils/node';

enum BalanceStatus {
	NOT_STARTED = 0,
	IN_PROGRESS = 1,
	COMPLETED = 2,
	ERROR = -1
}

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
	 * Balance retrieval status
	 * @type BalanceStatus
	 */
	private balanceStatus: BalanceStatus = BalanceStatus.NOT_STARTED;
	
	/**
	 * Wallet balance value
	 * @type string
	 */
	private balanceValue: string = '0 DVPN';
	
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
		switch(this.balanceStatus)
		{
			case BalanceStatus.NOT_STARTED: response = '0'; break;
			case BalanceStatus.IN_PROGRESS: response = '1'; break;
			case BalanceStatus.COMPLETED: response = this.balanceValue; break;
			case BalanceStatus.ERROR: response = '-1'; break;
		}
		
		Logger.info(`Node balance status: ${response}`);
		callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(response));
	}
	
	/**
	 * Called when the characteristic is written to start the balance retrieval process
	 * @param data Buffer
	 * @param offset number
	 * @param withoutResponse boolean
	 * @param callback (result: number) => void
	 * @returns void
	 */
	public onWriteRequest(data: Buffer, offset: number, withoutResponse: boolean, callback: (result: number) => void) 
	{
		if(this.balanceStatus === BalanceStatus.IN_PROGRESS)
		{
			Logger.error('Balance retrieval already in progress');
			callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			return;
		}
		
		this.balanceStatus = BalanceStatus.IN_PROGRESS;
		callback(this.Bleno.Characteristic.RESULT_SUCCESS);
		
		Logger.info('Starting wallet balance retrieval');
		
		const publicAddress = nodeManager.getConfig().walletPublicAddress;
		
		if (publicAddress === '')
		{
			this.balanceStatus = BalanceStatus.ERROR;
			this.balanceValue = '0 DVPN';
			Logger.error('Public address is missing');
			return;
		}
		
		walletBalance(publicAddress)
		.then((balance) =>
		{
			this.balanceValue = `${balance.amount} ${balance.denom}`;
			this.balanceStatus = BalanceStatus.COMPLETED;
			Logger.info(`Wallet balance retrieved successfully: ${this.balanceValue}`);
		})
		.catch((error: any) =>
		{
			Logger.error(`Error while retrieving wallet balance: ${error}`);
			this.balanceStatus = BalanceStatus.ERROR;
			this.balanceValue = '0 DVPN';
		});
	}
}
