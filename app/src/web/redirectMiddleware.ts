import { Request, Response, NextFunction } from 'express';
import config from '@utils/configuration';

/**
 * Middleware to redirect API requests from HTTP to HTTPS
 * @param req Request
 * @param res Response
 * @param next NextFunction
 */
export function redirectToHTTPS(req: Request, res: Response, next: NextFunction): void
{
	// If request is for API and is not HTTPS, redirect to HTTPS
	if (req.url.startsWith('/api/v1') && req.protocol !== 'https')
	{
		const hostname = req.hostname;
		const apiPort = parseInt(config.API_LISTEN.split(':')[1]) || 8081;

		const redirectUrl = `https://${hostname}:${apiPort}${req.url}`;
		console.log(`Redirecting API request from HTTP to HTTPS: ${redirectUrl}`);
		return res.redirect(301, redirectUrl);
	}
	next();
}
