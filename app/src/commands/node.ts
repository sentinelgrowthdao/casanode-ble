import {
	nodeConfig,
	createNodeConfig,
	createVpnConfig,
} from '@utils/node';

export const nodeCommand = async (options: any) =>
{
	if (options.showConfig)
	{
		console.log('Showing the node configuration...');
		
		const result = await nodeConfig();
		if (result)
			console.log(result);
		else
			console.log('Failed to show the node configuration');
	}
	else if (options.config)
	{
		console.log('Generating the node configuration...');
		
		const result = await createNodeConfig();
		if (result)
			console.log('Node configuration generated successfully');
		else
			console.log('Failed to generate the node configuration');
	}
	else if (options.vpn)
	{
		console.log('Generating the VPN configuration...');
		
		const result = await createVpnConfig();
		if (result)
			console.log('VPN configuration generated successfully');
		else
			console.log('Failed to generate the VPN configuration');
	}
	else
	{
		console.log('No Node command provided');
	}
};