import {
	imagePull,
	containerStart,
	containerStop,
	containerRestart,
	containerRemove,
	imagesRemove,
	containerStatus,
	containerLogs,
} from '@utils/docker';

export const dockerCommand = async (options: any) =>
{
	// If the pull option is provided, pull the Casanode Docker image
	if (options.pull)
	{
		console.log('Pulling the Casanode Docker image...');
		
		const result = await imagePull();
		if (result)
			console.log('Casanode Docker image pulled successfully');
		else
			console.log('Failed to pull the Casanode Docker image');
	}
	else if (options.removeImages)
	{
		console.log('Removing all Docker images...');
		
		const result = await imagesRemove();
		if (result)
			console.log('All Docker images removed successfully');
		else
			console.log('Failed to remove all Docker images');
	}
	else if (options.start)
	{
		console.log('Starting the Casanode Docker container...');
		
		const result = await containerStart();
		if (result)
			console.log('Casanode Docker container started successfully');
		else
			console.log('Failed to start the Casanode Docker container');
	}
	else if (options.stop)
	{
		console.log('Stopping the Casanode Docker container...');
		
		const result = await containerStop();
		if (result)
			console.log('Casanode Docker container stopped successfully');
		else
			console.log('Failed to stop the Casanode Docker container');
	}
	else if (options.restart)
	{
		console.log('Restarting the Casanode Docker container...');
		
		const result = await containerRestart();
		if (result)
			console.log('Casanode Docker container restarted successfully');
		else
			console.log('Failed to restart the Casanode Docker container');
	}
	else if (options.remove)
	{
		console.log('Removing the Casanode Docker container...');
		
		const result = await containerRemove();
		if (result)
			console.log('Casanode Docker container removed successfully');
		else
			console.log('Failed to remove the Casanode Docker container');
	}
	else if (options.status)
	{
		const status = await containerStatus();
		console.log(`Casanode Docker container status is ${status}`);
	}
	else if (options.logs)
	{
		const logs = await containerLogs();
		if (logs)
			console.log(logs);
		else
			console.log('Failed to get the logs of the Casanode Docker container');
	}
	else
	{
		console.log('No Docker command provided');
	}
};
