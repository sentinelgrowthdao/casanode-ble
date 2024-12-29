import { Request, Response, NextFunction } from 'express';
import config from '@utils/configuration';

/**
 * Middleware for Bearer token authentication
 * @param req Request
 * @param res Response
 * @param next NextFunction
 * @returns void
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void
{
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];
	
	// Check if token is provided
	if (token == null)
	{
		res.status(401).json({ error: 'Token is required' });
		return;
	}
	
	// Check against the token in the configuration
	if (token !== config.API_AUTH)
	{
		res.status(403).json({ error: 'Invalid token' });
		return;
	}
	
	// Valid token
	next();
}
