import { createRequire } from 'module';
import { Logger } from '@utils/logger';
import crypto from 'crypto';
import nodeManager from '@utils/node';

export class NodeMnemonicCharacteristic
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
	 * Data buffer
	 * @type Buffer
	 */
	private dataBuffer: Buffer = Buffer.alloc(0);
	
	/**
	 * Expected length of the data
	 * @type number
	 */
	private expectedLength: number = 0;
	
	/**
	 * Last timestamp
	 * @type number
	 */
	private lastTimestamp: number = 0;
	
	/**
	 * Read index
	 * @type number
	 */
	private readIndex: number = 0;
	
	/**
	 * Write index
	 * @type number
	 */
	private writeIndex: number = 0;
	
	/**
	 * Create a new instance of Characteristic
	 */
	constructor(uuid: string)
	{
		const require = createRequire(import.meta.url);
		this.Bleno = require('bleno');
		this.characteristicUuid = uuid;
		
		
		this.dataBuffer = Buffer.alloc(0);
		this.expectedLength = 0;
		this.lastTimestamp = 0;
		this.writeIndex = 0;
	}
	
	/**
	 * Create a new instance of NodeTypeCharacteristic
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
		const currentTimestamp = Date.now();
		if (this.readIndex === 0 || (currentTimestamp - this.lastTimestamp) > 3000 || this.dataBuffer.length === 0)
		{
			const mnemonic: string[] = nodeManager.getConfig().walletMnemonic;
			if (!mnemonic || mnemonic.length === 0)
			{
				Logger.error('No mnemonic found in nodeManager.');
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR, Buffer.from('Mnemonic not found'));
				return;
			}
			
			const mnemonicStr = mnemonic.join(' ');
			const hash = crypto.createHash('sha256').update(mnemonicStr).digest('hex');
			const dataToSend = `${mnemonicStr} ${hash}`;
			const dataBuffer = Buffer.from(dataToSend);
			
			this.dataBuffer = dataBuffer;
			this.expectedLength = dataBuffer.length;
			this.lastTimestamp = currentTimestamp;
			this.readIndex = 1;
			
			const lengthBuffer = Buffer.alloc(4);
			lengthBuffer.writeUInt32LE(this.expectedLength, 0);
			callback(this.Bleno.Characteristic.RESULT_SUCCESS, lengthBuffer);
		}
		else
		{
			// Calculate the chunk size
			const index = this.readIndex -1;
			const chunkSize = Math.min(20, this.expectedLength - (index * 20));
			// Create the chunk buffer
			const chunk = Buffer.alloc(chunkSize);
			// Copy the chunk data from the data buffer
			this.dataBuffer.copy(chunk, 0, 0, chunkSize);
			
			// Update the data buffer to remove the chunk
			const remainingData = Buffer.alloc(this.dataBuffer.length - chunkSize);
			this.dataBuffer.copy(remainingData, 0, chunkSize);
			this.dataBuffer = remainingData;
			
			// Update the read index
			this.readIndex++;
			this.lastTimestamp = currentTimestamp;
			
			// Return the chunk data
			callback(this.Bleno.Characteristic.RESULT_SUCCESS, chunk);
		}
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
		const currentTimestamp = Date.now();
		if (this.writeIndex === 0 || (currentTimestamp - this.lastTimestamp) > 3000)
		{
			this.dataBuffer = Buffer.alloc(0);
			this.expectedLength = data.readUInt32LE(0);
			this.lastTimestamp = currentTimestamp;
			this.writeIndex = 1;
			
			callback(this.Bleno.Characteristic.RESULT_SUCCESS);
			return;
		}
		
		this.dataBuffer = Buffer.concat([this.dataBuffer, data]);
		this.lastTimestamp = currentTimestamp;
		this.writeIndex++;
		
		const receivedLength = this.dataBuffer.length;
		if (receivedLength === this.expectedLength)
		{
			const receivedStr = this.dataBuffer.toString('utf-8');
			const parts = receivedStr.split(' ');
			const hash = parts.pop();
			const mnemonic = parts.join(' ');
			
			// Generate the hash of the received mnemonic
			const calculatedHash = crypto.createHash('sha256').update(mnemonic).digest('hex');
			
			// Mnemonic regex
			const mnemonicRegex = /^(\b\w+\b\s*){24}$/;
			
			// Check if the hash matches and mnemonic is valid
			if(calculatedHash === hash && mnemonicRegex.test(mnemonic))
			{
				nodeManager.setMnemonic(mnemonic.split(' '));
				callback(this.Bleno.Characteristic.RESULT_SUCCESS);
			}
			else
			{
				// If mnemonic is invalid
				if(!mnemonicRegex.test(mnemonic))
					Logger.error('Mnemonic format is invalid');
				else
					Logger.error('Hash mismatch for received mnemonic');
				
				callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
			}
		}
		else
		{
			callback(this.Bleno.Characteristic.RESULT_SUCCESS);
		}
	}
}
