import * as fs from 'fs';
import * as path from 'path';

export class Logger 
{
	private static logFilePath = '/var/log/casanode/app-ble.log';
	
	private static getFormattedDate(): string {
		const date = new Date();
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		const seconds = String(date.getSeconds()).padStart(2, '0');
		return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
	}
	
	public static info(message: string): void 
	{
		const timestamp = this.getFormattedDate();
		const logMessage = `[${timestamp}] INFO: ${message}\n`;
		this.writeToLog(logMessage);
	}
	
	public static error(message: string): void 
	{
		const timestamp = this.getFormattedDate();
		const logMessage = `[${timestamp}] ERROR: ${message}\n`;
		this.writeToLog(logMessage);
	}
	
	private static writeToLog(message: string): void 
	{
		try 
		{
			// Append message to log file, creating the file with specific permissions if it does not exist
			fs.appendFileSync(path.resolve(this.logFilePath), message, { mode: 0o640 });
		}
		catch (error) 
		{
			console.error('An error occurred while writing to log file:', error);
		}
	}
}
