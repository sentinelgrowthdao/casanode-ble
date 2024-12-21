import * as fs from 'fs';
import * as path from 'path';
import config from './configuration';

export class Logger 
{
	/**
	 * The path to the log file
	 * @type {string}
	 */
	private static logFilePath = path.join(config?.LOG_DIR || '/var/log/casanode/', 'app-ble.log');
	
	/**
	 * Get a formatted date string
	 * @returns string
	 */
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
	
	/**
	 * Log an informational message
	 * @param message - The message to log
	 * @returns void
	 */
	public static info(message: string): void 
	{
		const timestamp = this.getFormattedDate();
		const logMessage = `[${timestamp}] INFO: ${message}\n`;
		this.writeToLog(logMessage);
	}
	
	/**
	 * Log an error message
	 * @param message - The message to log
	 */
	public static error(message: string): void 
	{
		const timestamp = this.getFormattedDate();
		const logMessage = `[${timestamp}] ERROR: ${message}\n`;
		this.writeToLog(logMessage);
	}
	
	/**
	 * Write a message to the log file
	 * @param message - The message to write to the log file
	 * @returns void
	 */
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
