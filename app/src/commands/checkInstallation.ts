import { checkInstallation, type InstallationCheck } from '@actions/index';

export const checkInstallationCommand = async (options: any) =>
{
	// Execute the checkInstallation function
	const status : InstallationCheck = await checkInstallation();
	
	// Display the results
	console.log(`Installation status:`);
	console.log(`Docker image: ${status.image ? 'available' : 'not available'}`);
	console.log(`Docker container: ${status.containerExists ? 'exists' : 'does not exist'}`);
	console.log(`Sentinel config: ${status.sentinelConfig ? 'available' : 'not available'}`);
	console.log(`Wireguard config: ${status.wireguardConfig ? 'available' : 'not available'}`);
	console.log(`V2Ray config: ${status.v2rayConfig ? 'available' : 'not available'}`);
};
