import { Request, Response, NextFunction } from 'express';
import config from '@utils/configuration';

/**
 * Middleware for Bearer token authentication
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction)
{
	const authHeader = req.headers['authorization'];
	const token = authHeader && authHeader.split(' ')[1];
	
	// Check if token is provided
	if(token == null)
	{
		return res.status(401).json({ error: 'Token is required' });
	}
	
	// Check against the token in the configuration
	if(token !== config.API_AUTH)
	{
		return res.status(403).json({ error: 'Invalid token' });
	}
	
	// Valid token
	next();
}
