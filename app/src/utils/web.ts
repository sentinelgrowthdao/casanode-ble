import express from 'express';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { Logger } from '@utils/logger';
import nodeManager from '@utils/node';
import config from '@utils/configuration';

class WebServer
{
	private static instance: WebServer;
	private app = express();
	private HOSTNAME = '0.0.0.0';
	private PORT = 8080;
	private baseDir = process.env.BASE_DIR || path.resolve(__dirname, '../../');
	
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
		// Assets directory
		const assetsDir = path.join(this.baseDir, 'web');
		
		// Serve static files from the assets directory
		this.app.use('/assets', express.static(assetsDir));
		
		// Serve the index.html file
		this.app.get('/', async (req: any, res: any) =>
		{
			// Get node configuration
			const nodeConfig = nodeManager.getConfig();
			// Get local IP address
			const localIPAddress = this.getLocalIPAddress();
			
			// QR code data
			const qrData = {
				device: 'casanode',
				os: nodeConfig.systemOs,
				kernel: nodeConfig.systemKernel,
				architecture: nodeConfig.systemArch,
				bluetooth: config.BLE_UUID,
				ip: localIPAddress,
				port: this.PORT,
				auth: config.WEB_AUTH,
			};
			
			// Generate QR code data URL
			const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));
			// Read the HTML file
			const htmlFilePath = path.join(assetsDir, 'index.html');
			// Read the HTML file
			fs.readFile(htmlFilePath, 'utf8', (err, html) =>
			{
				// Send error if file could not be loaded
				if (err)
				{
					Logger.error('Error loading HTML file');
					res.status(500).send('Error loading HTML file');
					return;
				}
				
				Logger.info('Serving HTML file');
				// Replace the placeholder with the QR code data URL
				const modifiedHtml = html.replace('QR_CODE_DATA_URL', qrCodeDataURL);
				// Send the modified HTML file
				res.send(modifiedHtml);
			});
		});
	}
	
	/**
	 * Get the local IP address
	 * @returns string | null
	 */
	private getLocalIPAddress(): string | null
	{
		// Get the network interfaces
		const networkInterfaces = os.networkInterfaces();
		// Iterate over the network interfaces
		for(const interfaceName in networkInterfaces)
		{
			// Get the network info for the interface
			const networkInfo = networkInterfaces[interfaceName];
			// if network info is available
			if(networkInfo)
			{
				// Iterate over the network info
				for(const info of networkInfo)
				{
					// If the info is an IPv4 address and not internal
					if(info.family === 'IPv4' && !info.internal)
						return info.address;
				}
			}
		}
		
		return null;
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
