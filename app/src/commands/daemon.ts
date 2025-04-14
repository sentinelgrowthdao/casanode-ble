import { Logger } from '@utils/logger';
import WebServer from '@utils/web';
import { loadingNodeInformations, loadingSystemInformations } from '@actions/startup';

/**
 * Daemon command
 * @returns void
 */
export const daemonCommand = async () =>
{
	Logger.info('Daemon process started.');
	
	try
	{
		// Load system information
		await loadingSystemInformations();
		
		// Load node information
		await loadingNodeInformations();
		
		// Start the web server
		await startWebServer();
	}
	catch (error: any)
	{
		Logger.error('An unexpected error occurred in daemon process.', error);
	}
};

/**
 * Start the web server
 * @returns void
 */
const startWebServer = async () =>
{
	try
	{
		Logger.info('Starting web server...');
		
		// Get the web server instance
		const webServer = WebServer.getInstance();
		// Initialize SSL and routes
		await webServer.init();
		// Start the web server
		webServer.start();
		
		Logger.info('Web server started successfully.');
	}
	catch (error: any)
	{
		Logger.error('Failed to start the web server.', error);
	}
};
