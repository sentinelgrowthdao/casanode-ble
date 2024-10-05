import express from 'express';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { Logger } from '@utils/logger';
import config from '@utils/configuration';
import apiRouter from '@web/apiRoutes';
import webRouter from '@web/webRoutes';
import { redirectToHTTPS } from '@web/redirectMiddleware';
import { certificateGenerate } from '@utils/certificate';

class WebServer
{
	private static instance: WebServer;
	private app = express();
	private webHostname = '0.0.0.0';
	private apiHostname = '0.0.0.0';
	private webPort = 8080;
	private apiPort = 8081;
	private certFilePath: string = path.join(config.CONFIG_DIR, 'web.crt');
	private keyFilePath: string = path.join(config.CONFIG_DIR, 'web.key');
	
	private constructor()
	{
		// If the WEB_LISTEN configuration is set
		if(config.WEB_LISTEN && config.WEB_LISTEN.includes(':'))
		{
			// Set the port and hostname from the configuration
			this.webHostname = config.WEB_LISTEN.split(':')[0] || '0.0.0.0';
			this.webPort = parseInt(config.WEB_LISTEN.split(':')[1]) || 8080;
		}
		// If the API_LISTEN configuration is set
		if(config.API_LISTEN && config.API_LISTEN.includes(':'))
		{
			// Set the port and hostname from the configuration
			this.apiHostname = config.API_LISTEN.split(':')[0] || '0.0.0.0';
			this.apiPort = parseInt(config.API_LISTEN.split(':')[1]) || 8081;
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
				Logger.info('SSL certificate for API server generated successfully.');
			else
				Logger.info('SSL certificate for API server already exists.');
		}
		catch (error)
		{
			Logger.error(`Failed to generate SSL certificate for API server: ${error}`);
			process.exit(1);
		}
	}
	
	/**
	 * Setup routes for HTTP and HTTPS
	 * @returns void
	 */
	private setupRoutes()
	{
		// Use the redirect middleware for API requests
		this.app.use(redirectToHTTPS);
		
		// Add the JSON parsing middleware
		this.app.use(express.json());
		
		// Add the web routes (available on both HTTP and HTTPS)
		this.app.use('/', webRouter);
		
		// Add the API routes (HTTPS only)
		this.app.use('/api/v1', apiRouter);
	}
	
	/**
	 * Start the web server with both HTTP (for / on webPort)
	 * and HTTPS (for / and API on apiPort)
	 * @returns void
	 */
	public start()
	{
		// Start the HTTP server (for the main route / on webPort)
		http.createServer(this.app).listen(this.webPort, this.webHostname, () =>
		{
			console.log(`Web server running at http://${this.webHostname}:${this.webPort}`);
			Logger.info(`Web server running at http://${this.webHostname}:${this.webPort}`);
		});
		
		// SSL options for the HTTPS server
		const sslOptions = {
			key: fs.readFileSync(this.keyFilePath),
			cert: fs.readFileSync(this.certFilePath)
		};
		
		// Start the HTTPS server (for API and / on apiPort)
		https.createServer(sslOptions, this.app).listen(this.apiPort, this.apiHostname, () =>
		{
			console.log(`API server running securely at https://${this.apiHostname}:${this.apiPort}`);
			Logger.info(`API server running securely at https://${this.apiHostname}:${this.apiPort}`);
		});
	}
}

export default WebServer;
