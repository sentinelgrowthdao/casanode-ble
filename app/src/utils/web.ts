import express from 'express';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { Logger } from '@utils/logger';
import nodeManager from '@utils/node';
import config from '@utils/configuration';

class WebServer
{
	private static instance: WebServer;
	private app = express();
	private PORT = config.WEB_PORT;
	private baseDir = process.env.BASE_DIR || path.resolve(__dirname, '../../');
	
	private constructor()
	{
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
			
			// QR code data
			const qrData = {
				device: 'casanode',
				os: nodeConfig.systemOs,
				kernel: nodeConfig.systemKernel,
				architecture: nodeConfig.systemArch,
				bluetooth: config.BLE_UUID
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
	 * Start the web server
	 * @returns void
	 */
	public start()
	{
		this.app.listen(this.PORT, () =>
		{
			console.log(`Web server running at http://localhost:${this.PORT}`);
			Logger.info(`Web server running at http://localhost:${this.PORT}`);
		});
	}
}

export default WebServer;
