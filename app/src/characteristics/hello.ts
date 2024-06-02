
import { createRequire } from 'module';

export class HelloCharacteristic
{
	private helloValue: string = 'default';
	private notifyCallback: (() => void) | null = null;
	private Bleno: any = undefined;
	
	/**
	 * Create a new instance of Characteristic
	 */
	constructor(private characteristicUuid: string) 
	{
		console.log('HelloCharacteristic created');
		const require = createRequire(import.meta.url);
		this.Bleno = require('bleno');
	}
	
	/**
	 * Create a new instance of HelloCharacteristic
	 * @param uuid - UUID of the characteristic
	 */
	public static create(uuid: string)//: typeof Bleno.Characteristic 
	{
		const handler = new HelloCharacteristic(uuid);
		return handler.createCharacteristic();
	}
	
	/**
	 * Create the characteristic
	 * @returns typeof Bleno.Characteristic
	 */
	private createCharacteristic()//: typeof Bleno.Characteristic  
	{
		if(this.Bleno === undefined)
			return null;
		
		return new this.Bleno.Characteristic({
			uuid: this.characteristicUuid,
			properties: ['read', 'write', 'notify'],
			onReadRequest: this.onReadRequest.bind(this),
			onWriteRequest: this.onWriteRequest.bind(this),
			onSubscribe: this.onSubscribe.bind(this),
			onUnsubscribe: this.onUnsubscribe.bind(this)
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
		console.log('HelloCharacteristic - onReadRequest: value = ' + this.helloValue);
		callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(this.helloValue));
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
		console.log('HelloCharacteristic - onWriteRequest: value = ' + data.toString('utf-8'));
		this.helloValue = data.toString('utf-8');
		if (this.notifyCallback) 
		{
			this.notifyCallback();
		}
		// callback(this.Bleno.Characteristic.RESULT_ATTR_NOT_LONG);
		// callback(this.Bleno.Characteristic.RESULT_INVALID_ATTRIBUTE_LENGTH);
		// callback(this.Bleno.Characteristic.RESULT_INVALID_OFFSET);
		// callback(this.Bleno.Characteristic.RESULT_UNLIKELY_ERROR);
		callback(this.Bleno.Characteristic.RESULT_SUCCESS);
	}

	public onSubscribe(maxValueSize: number, updateValueCallback: (data: Buffer) => void) 
	{
		console.log('HelloCharacteristic - onSubscribe - max value size = ' + maxValueSize);
		this.notifyCallback = () => 
		{
			updateValueCallback(Buffer.from(this.helloValue));
		};
	}

	public onUnsubscribe() 
	{
		this.notifyCallback = null;
	}
}