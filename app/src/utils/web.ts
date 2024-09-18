import express from 'express';
import { Logger } from '@utils/logger';
import config from '@utils/configuration';
import apiRouter from '@web/apiRoutes';;
import webRouter from '@web/webRoutes';

class WebServer
{
	private static instance: WebServer;
	private app = express();
	private HOSTNAME = '0.0.0.0';
	private PORT = 8080;
	
	private constructor()
	{
		// If the WEB_LISTEN configuration is set
		if(config.WEB_LISTEN && config.WEB_LISTEN.includes(':'))
		{
			// Set the port and hostname from the configuration
			this.HOSTNAME = config.WEB_LISTEN.split(':')[0] || '0.0.0.0';
			this.PORT = parseInt(config.WEB_LISTEN.split(':')[1]) || 8080;
		}
		
		// Setup routes
		this.setupRoutes();
	}
	
	/**
	 * Get instance of WebServer
	 * @returns WebServer
	 */
	public static getInstance(): WebServer
	{
		if (!WebServer.instance)
		{
			WebServer.instance = new WebServer();
		}
		return WebServer.instance;
	}
	
	/**
	 * Setup routes
	 * @returns void
	 */
	private setupRoutes()
	{
		// Add the web routes
		this.app.use('/', webRouter);
		
		// Add the API routes
		this.app.use('/api/v1', apiRouter);
	}
	
	/**
	 * Start the web server
	 * @returns void
	 */
	public start()
	{
		this.app.listen(this.PORT, this.HOSTNAME, () =>
		{
			console.log(`Web server running at http://${this.HOSTNAME}:${this.PORT}`);
			Logger.info(`Web server running at http://${this.HOSTNAME}:${this.PORT}`);
		});
	}
}

export default WebServer;
