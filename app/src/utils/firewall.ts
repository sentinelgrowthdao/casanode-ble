
import { Logger } from './logger';
import ufw from 'node-ufw';

class FirewallManager
{
	private static instance: FirewallManager;
	
	
	private constructor()
	{
	}
	
	/**
	 * Get instance of FirewallManager
	 * @returns FirewallManager
	 */
	public static getInstance(): FirewallManager
	{
		if (!FirewallManager.instance)
		{
			FirewallManager.instance = new FirewallManager();
		}
		return FirewallManager.instance;
	}
	
	/**
	 * Enable port 
	 * @param port 
	 */
	public async enable(port: number): Promise<boolean>
	{
		
		try
		{
			await ufw.allow(port);
			Logger.info(`Enabling port ${port}`);
		}
		catch (error)
		{
			if (error instanceof Error)
				Logger.error(`Failed to enable port: ${error.message}`);
			else
				Logger.error(`Failed to enable port: ${String(error)}`);
		}
		
		return false;
	}
	
	/**
	 * Delete port 
	 * @param port 
	 */
	public async delete(port: number): Promise<boolean>
	{
		
		try
		{
			await ufw.deny(port);
			Logger.info(`Disabling port ${port}`);
		}
		catch (error)
		{
			if (error instanceof Error)
				Logger.error(`Failed to delete port: ${error.message}`);
			else
				Logger.error(`Failed to delete port: ${String(error)}`);
		}
		
		return false;
	}

}

// Create a singleton instance of firewallManager
const firewallManager = FirewallManager.getInstance();
export default firewallManager;