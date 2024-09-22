import os from 'os';

/**
 * Get the local IP address
 * @returns string | null
 */
export function getLocalIPAddress(): string | null
{
	// Get the network interfaces
	const networkInterfaces = os.networkInterfaces();
	// Iterate over the network interfaces
	for(const interfaceName in networkInterfaces)
	{
		// Get the network information
		const networkInfo = networkInterfaces[interfaceName];
		// Check if the network information is valid
		if(networkInfo)
		{
			// Iterate over the network information
			for(const info of networkInfo)
			{
				// Check if the network information is an IPv4 address and not internal
				if(info.family === 'IPv4' && !info.internal)
					return info.address;
			}
		}
	}
	// Return null if no valid IP address is found
	return null;
}
