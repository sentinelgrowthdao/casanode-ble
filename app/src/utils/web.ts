import express from 'express';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { Logger } from '@utils/logger';
import config from '@utils/configuration';
import apiRouter from '@web/apiRoutes';;
import webRouter from '@web/webRoutes';
import { certificateGenerate } from '@utils/certificate';

class WebServer
{
	private static instance: WebServer;
	private app = express();
	private hostname = '0.0.0.0';
	private port = 8080;
	private certFilePath: string = path.join(config.CONFIG_DIR, 'web.crt');
	private keyFilePath: string = path.join(config.CONFIG_DIR, 'web.key');
	
	private constructor()
	{
		// If the WEB_LISTEN configuration is set
		if(config.WEB_LISTEN && config.WEB_LISTEN.includes(':'))
		{
			// Set the port and hostname from the configuration
			this.hostname = config.WEB_LISTEN.split(':')[0] || '0.0.0.0';
			this.port = parseInt(config.WEB_LISTEN.split(':')[1]) || 8080;
		}
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
	 * Initialize the web server, generating SSL certificates if needed
	 * and setting up routes.
	 */
	public async init(): Promise<void>
	{
		// Generate the certificate if needed
		await this.setupSSL();
		// Setup routes
		this.setupRoutes();
	}
	
	/**
	 * Generate SSL certificates if they don't exist
	 */
	private async setupSSL()
	{
		try
		{
			// Generate certificate if it does not exist
			const success = await certificateGenerate(5, this.certFilePath, this.keyFilePath);
			if (success)
				Logger.info('SSL certificate for web server generated successfully.');
			else
				Logger.info('SSL certificate for web server already exists.');
		}
		catch (error)
		{
			Logger.error(`Failed to generate SSL certificate for web server: ${error}`);
			process.exit(1);
		}
	}
	
	/**
	 * Setup routes
	 * @returns void
	 */
	private setupRoutes()
	{
		// Add the JSON parsing middleware
		this.app.use(express.json());
		
		// Add the web routes
		this.app.use('/', webRouter);
		
		// Add the API routes
		this.app.use('/api/v1', apiRouter);
	}
	
	/**
	 * Start the web server with HTTPS
	 * @returns void
	 */
	public start()
	{
		const sslOptions = {
			key: fs.readFileSync(this.keyFilePath),
			cert: fs.readFileSync(this.certFilePath)
		};
		
		// Start the HTTPS server
		https.createServer(sslOptions, this.app).listen(this.port, this.hostname, () =>
		{
			console.log(`Web server running securely at https://${this.hostname}:${this.port}`);
			Logger.info(`Web server running securely at https://${this.hostname}:${this.port}`);
		});
	}
}

export default WebServer;
