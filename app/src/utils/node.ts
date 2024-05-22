import * as fs from 'fs';
import * as path from 'path';
import config from './configuration';
import { Logger } from '@utils/logger';

class NodeManager
{
	private static instance: NodeManager;
	private config: ConfigData;
	
	private constructor()
	{
		this.config = config;
	}
	
	/**
	 * Get instance of NodeManager
	 * @returns NodeManager
	 */
	public static getInstance(): NodeManager
	{
		if (!NodeManager.instance)
		{
			NodeManager.instance = new NodeManager();
		}
		return NodeManager.instance;
	}
	
	/**
	 * Get current configuration
	 * @returns ConfigData
	 */
	public getConfig(): ConfigData
	{
		return this.config;
	}
	
	/**
	 * Check if the configuration file exists
	 * @param configFilePath - Path to the configuration file
	 * @returns boolean
	 */
	public isConfigFileAvailable(configFilePath: string): boolean
	{
		try
		{
			return fs.existsSync(configFilePath);
		}
		catch (error)
		{
			Logger.error(`Error checking config file ${configFilePath}: ${error}`);
			return false;
		}
	}
	
	/**
	 * Load configuration files and extract node parameters
	 */
	public loadNodeConfig(): void
	{
		const configFilePath = path.join(this.config.CONFIG_DIR, 'config.toml');
		if (!this.isConfigFileAvailable(configFilePath))
		{
			Logger.info("Configuration files do not exist.");
			return;
		}
		
		Logger.info("Please wait while the configuration files are being loaded...");
		
		try
		{
			const configFileContent = fs.readFileSync(configFilePath, 'utf8');
			
			this.config.NODE_MONIKER = this.extractConfigValue(configFileContent, 'moniker');
			this.config.NODE_TYPE = this.extractConfigValue(configFileContent, 'type');
			this.config.NODE_IP = this.extractConfigValue(configFileContent, 'remote_url').split('/')[2].split(':')[0];
			this.config.NODE_PORT = this.extractConfigValue(configFileContent, 'listen_on').split(':')[1];
			this.config.CHAIN_ID = this.extractConfigValue(configFileContent, 'id');
			this.config.MAX_PEERS = this.extractConfigValue(configFileContent, 'max_peers');
			this.config.BACKEND = this.extractConfigValue(configFileContent, 'backend');
			this.config.WALLET_NAME = this.extractConfigValue(configFileContent, 'from');
			this.config.HANDSHAKE_ENABLE = this.extractConfigValueInSection(configFileContent, 'handshake', 'enable');
			const hourlyPrices = this.extractConfigValue(configFileContent, 'hourly_prices');
			this.config.NODE_LOCATION = hourlyPrices === process.env.DATACENTER_HOURLY_PRICES ? 'datacenter' : hourlyPrices ? 'residential' : '';

			Logger.info("Configuration files have been loaded.");
		}
		catch (error)
		{
			Logger.error(`Error loading node configuration: ${error}`);
		}
	}

	/**
	 * Extract configuration value from the content
	 * @param content - File content
	 * @param key - Configuration key
	 * @returns string
	 */
	private extractConfigValue(content: string, key: string): string
	{
		const regex = new RegExp(`^${key}\\s*=\\s*"(.*)"`, 'm');
		const match = content.match(regex);
		return match ? match[1].trim() : '';
	}
	
	/**
	 * Extract configuration value from a specific section
	 * @param content - File content
	 * @param section - Section name
	 * @param key - Configuration key
	 * @returns string
	 */
	private extractConfigValueInSection(content: string, section: string, key: string): string
	{
		const sectionRegex = new RegExp(`\\[${section}\\]([\\s\\S]*?)\\[`, 'm');
		const sectionMatch = content.match(sectionRegex);
		if(sectionMatch)
		{
			const keyRegex = new RegExp(`^${key}\\s*=\\s*"(.*)"`, 'm');
			const keyMatch = sectionMatch[1].match(keyRegex);
			return keyMatch ? keyMatch[1].trim() : '';
		}
		return '';
	}

	/**
	 * Refresh node configuration files
	 */
	public refreshConfigFiles(): void
	{
		const configFilePath = path.join(this.config.CONFIG_DIR, 'config.toml');

		try
		{
			this.updateConfigValue(configFilePath, 'moniker', this.config.NODE_MONIKER);
			this.updateConfigValue(configFilePath, 'id', this.config.CHAIN_ID);
			this.updateConfigValue(configFilePath, 'rpc_addresses', this.config.RPC_ADDRESSES.replace(/\//g, '\\/'));
			this.updateConfigValue(configFilePath, 'type', this.config.NODE_TYPE);
			this.updateConfigValue(configFilePath, 'listen_on', `0.0.0.0:${this.config.NODE_PORT}`);
			this.updateConfigValue(configFilePath, 'remote_url', `https://${this.config.NODE_IP}:${this.config.NODE_PORT}`);
			this.updateConfigValue(configFilePath, 'backend', this.config.BACKEND);
			this.updateConfigValueInSection(configFilePath, 'handshake', 'enable', this.config.HANDSHAKE_ENABLE);
			this.updateConfigValue(configFilePath, 'max_peers', this.config.MAX_PEERS);
			this.updateConfigValue(configFilePath, 'gas', this.config.GAS);
			this.updateConfigValue(configFilePath, 'gas_adjustment', this.config.GAS_ADJUSTMENT);
			this.updateConfigValue(configFilePath, 'gas_price', this.config.GAS_PRICE);
			
			if(this.config.NODE_LOCATION === 'residential')
			{
				this.updateConfigValue(configFilePath, 'gigabyte_prices', this.config.RESIDENTIAL_GIGABYTE_PRICES.replace(/\//g, '\\/'));
				this.updateConfigValue(configFilePath, 'hourly_prices', this.config.RESIDENTIAL_HOURLY_PRICES.replace(/\//g, '\\/'));
			}
			else
			{
				this.updateConfigValue(configFilePath, 'gigabyte_prices', this.config.DATACENTER_GIGABYTE_PRICES.replace(/\//g, '\\/'));
				this.updateConfigValue(configFilePath, 'hourly_prices', this.config.DATACENTER_HOURLY_PRICES.replace(/\//g, '\\/'));
			}
			
			if(this.config.NODE_TYPE === 'wireguard')
			{
				const wireguardConfigPath = path.join(this.config.CONFIG_DIR, 'wireguard.toml');
				this.updateConfigValue(wireguardConfigPath, 'listen_port', this.config.WIREGUARD_PORT);
			}
			else if(this.config.NODE_TYPE === 'v2ray')
			{
				const v2rayConfigPath = path.join(this.config.CONFIG_DIR, 'v2ray.toml');
				this.updateConfigValue(v2rayConfigPath, 'listen_port', this.config.V2RAY_PORT);
			}
			
			Logger.info("Configuration files have been refreshed.");
		}
		catch (error)
		{
			Logger.error(`Error refreshing configuration files: ${error}`);
		}
	}
	
	/**
	 * Update a configuration value in a file
	 * @param filePath - Path to the configuration file
	 * @param key - Configuration key
	 * @param value - New value
	 */
	private updateConfigValue(filePath: string, key: string, value: string): void
	{
		const regex = new RegExp(`^(${key}\\s*=\\s*).*`, 'm');
		const content = fs.readFileSync(filePath, 'utf8');
		const newValue = `${key} = "${value}"`;
		const newContent = content.replace(regex, newValue);
		fs.writeFileSync(filePath, newContent, 'utf8');
	}
	
	/**
	 * Update a configuration value in a specific section of a file
	 * @param filePath - Path to the configuration file
	 * @param section - Section name
	 * @param key - Configuration key
	 * @param value - New value
	 */
	private updateConfigValueInSection(filePath: string, section: string, key: string, value: string): void
	{
		const sectionRegex = new RegExp(`(\\[${section}\\][\\s\\S]*?)(^${key}\\s*=\\s*).*`, 'm');
		const content = fs.readFileSync(filePath, 'utf8');
		const newValue = `${key} = "${value}"`;
		const newContent = content.replace(sectionRegex, `$1${newValue}`);
		fs.writeFileSync(filePath, newContent, 'utf8');
	}
}

// Exporter une instance unique de NodeManager
const nodeManager = NodeManager.getInstance();
export default nodeManager;

// Exporter des fonctions utilitaires
export const nodeConfig = (): ConfigData => nodeManager.getConfig();
export const isNodeConfigFileAvailable = (): boolean => nodeManager.isConfigFileAvailable(path.join(nodeManager.getConfig().CONFIG_DIR, 'config.toml'));
export const isWireguardConfigFileAvailable = (): boolean => nodeManager.isConfigFileAvailable(path.join(nodeManager.getConfig().CONFIG_DIR, 'wireguard.toml'));
export const isV2RayConfigFileAvailable = (): boolean => nodeManager.isConfigFileAvailable(path.join(nodeManager.getConfig().CONFIG_DIR, 'v2ray.toml'));
