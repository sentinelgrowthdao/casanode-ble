
import { createRequire } from 'module';

export class HelloCharacteristic 
{
	private helloValue: string = 'default';
	private notifyCallback: (() => void) | null = null;
	private Bleno: any = undefined;
	
	constructor(private characteristicUuid: string) 
	{
		console.log('HelloCharacteristic created');
		const require = createRequire(import.meta.url);
		this.Bleno = require('bleno');
	}
	
	public static createHelloCharacteristic(characteristicUuid: string)//: typeof Bleno.Characteristic 
	{
		const handler = new HelloCharacteristic(characteristicUuid);
		return handler.createCharacteristic();
	}
	
	public onReadRequest(offset: number, callback: (result: number, data: Buffer) => void) 
	{
		callback(this.Bleno.Characteristic.RESULT_SUCCESS, Buffer.from(this.helloValue));
	}
	
	public onWriteRequest(data: Buffer, offset: number, withoutResponse: boolean, callback: (result: number) => void) 
	{
		this.helloValue = data.toString('utf-8');
		if (this.notifyCallback) 
		{
			this.notifyCallback();
		}
		callback(this.Bleno.Characteristic.RESULT_SUCCESS);
	}

	public onSubscribe(maxValueSize: number, updateValueCallback: (data: Buffer) => void) 
	{
		this.notifyCallback = () => 
		{
			updateValueCallback(Buffer.from(this.helloValue));
		};
	}

	public onUnsubscribe() 
	{
		this.notifyCallback = null;
	}

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
}