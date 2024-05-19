import * as fs from 'fs';
import * as path from 'path';

export class Logger 
{
	private static logFilePath = '/var/log/casanode/app-ble.log';
	
	public static log(message: string): void 
	{
		const logMessage = `[INFO] ${message}\n`;
		this.writeToLog(logMessage);
	}
	
	public static error(message: string): void 
	{
		const errorMessage = `[ERROR] ${message}\n`;
		this.writeToLog(errorMessage);
	}
	
	private static writeToLog(message: string): void 
	{
		try 
		{
			// Append message to log file
			fs.appendFileSync(path.resolve(this.logFilePath), message);
		}
		catch (error) 
		{
			console.error('An error occurred while writing to log file:', error);
		}
	}
}
