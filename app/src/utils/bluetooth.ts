import { exec } from 'child_process';

/**
 * Check if Bluetooth is available
 * @returns Promise<boolean>
 */
export const isBluetoothAvailable = (): Promise<boolean> =>
{
	// Return a promise to check if the Bluetooth controller is available
	return new Promise((resolve, _reject) =>
	{
		// Execute the hciconfig command to check for Bluetooth controller
		exec('hciconfig', (error, stdout, stderr) =>
		{
			// Check if there is an error or no Bluetooth controller is found
			if (error || stderr || !stdout.includes('hci'))
				resolve(false);
			else
				resolve(true);
		});
	});
};
