import * as fs from 'fs';
import * as path from 'path';
import config from './configuration';
import { Logger } from '@utils/logger';
import { containerCommand } from '@utils/docker';

// Defaults values for node configuration
const DATACENTER_GIGABYTE_PRICES="52573ibc/31FEE1A2A9F9C01113F90BD0BBCCE8FD6BBB8585FAF109A2101827DD1D5B95B8,9204ibc/A8C2D23A1E6F95DA4E48BA349667E322BD7A6C996D8A4AAE8BA72E190F3D1477,1180852ibc/B1C0DDB14F25279A2026BC8794E12B259F8BDA546A3C5132CCAEE4431CE36783,122740ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518,15342624udvpn";
const DATACENTER_HOURLY_PRICES="18480ibc/31FEE1A2A9F9C01113F90BD0BBCCE8FD6BBB8585FAF109A2101827DD1D5B95B8,770ibc/A8C2D23A1E6F95DA4E48BA349667E322BD7A6C996D8A4AAE8BA72E190F3D1477,1871892ibc/B1C0DDB14F25279A2026BC8794E12B259F8BDA546A3C5132CCAEE4431CE36783,18897ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518,4160000udvpn";

export interface NodeConfigData
{
	[key: string]: string | number | boolean | undefined;
	moniker: string;
	chain_id: string;
	rpc_addresses: string;
	node_ip: string;
	node_type: string;
	node_port: number;
	vpn_port: number;
	backend: string;
	handshake: boolean;
	wallet_name: string;
	max_peers: number;
	gas: string;
	gas_adjustment: string;
	gas_prices: string;
	node_location: string;
	gigabyte_prices: string;
	hourly_prices: string;
	walletPassphrase: string;
}

class NodeManager
{
	private static instance: NodeManager;
	private nodeConfig: NodeConfigData = {
		moniker: '',
		chain_id: '',
		rpc_addresses: '',
		node_ip: '',
		node_type: '',
		node_port: 0,
		vpn_port: 0,
		backend: '',
		handshake: false,
		wallet_name: '',
		max_peers: 0,
		gas: '',
		gas_adjustment: '',
		gas_prices: '',
		node_location: '',
		gigabyte_prices: '',
		hourly_prices: '',
		walletPassphrase: '',
	};
	
	private constructor()
	{
		this.loadNodeConfig();
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
	 * @returns NodeConfigData
	 */
	public getConfig(): NodeConfigData
	{
		return this.nodeConfig;
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
		// Initialize node configuration file path
		const configFilePath = path.join(config.CONFIG_DIR, 'config.toml');
		// If the configuration files do not exist, do nothing
		if (!this.isConfigFileAvailable(configFilePath))
		{
			Logger.info("Configuration files do not exist.");
			return ;
		}
		
		try
		{
			// Load configuration file content
			const configFileContent = fs.readFileSync(configFilePath, 'utf8');
			
			// Parse configuration file content
			this.nodeConfig.moniker = this.extractConfigValue(configFileContent, 'moniker');
			this.nodeConfig.chain_id = this.extractConfigValue(configFileContent, 'id');
			this.nodeConfig.rpc_addresses = this.extractConfigValue(configFileContent, 'rpc_addresses');
			this.nodeConfig.node_type = this.extractConfigValue(configFileContent, 'type');
			this.nodeConfig.node_ip = this.extractConfigValue(configFileContent, 'remote_url').split('/')[2].split(':')[0];
			this.nodeConfig.node_port = parseInt(this.extractConfigValue(configFileContent, 'listen_on').split(':')[1]);
			this.nodeConfig.max_peers = parseInt(this.extractConfigValue(configFileContent, 'max_peers'));
			this.nodeConfig.backend = this.extractConfigValue(configFileContent, 'backend');
			this.nodeConfig.wallet_name = this.extractConfigValue(configFileContent, 'from');
			this.nodeConfig.handshake = this.extractConfigValueInSection(configFileContent, 'handshake', 'enable') === 'true';
			this.nodeConfig.gas = this.extractConfigValue(configFileContent, 'gas');
			this.nodeConfig.gas_adjustment = this.extractConfigValue(configFileContent, 'gas_adjustment');
			this.nodeConfig.gas_prices = this.extractConfigValue(configFileContent, 'gas_prices');
			this.nodeConfig.gigabyte_prices = this.extractConfigValue(configFileContent, 'gigabyte_prices');
			this.nodeConfig.hourly_prices = this.extractConfigValue(configFileContent, 'hourly_prices');
			this.nodeConfig.node_location = this.nodeConfig.hourly_prices === DATACENTER_HOURLY_PRICES ? 'datacenter' : this.nodeConfig.hourly_prices ? 'residential' : '';
			
			// Load WireGuard configuration file content
			if(this.nodeConfig.node_type === 'wireguard')
			{
				const wireguardConfigPath = path.join(config.CONFIG_DIR, 'wireguard.toml');
				const wireguardConfigContent = fs.readFileSync(wireguardConfigPath, 'utf8');
				this.nodeConfig.vpn_port = parseInt(this.extractConfigValue(wireguardConfigContent, 'listen_port'));
			}
			// Load V2Ray configuration file content
			else if(this.nodeConfig.node_type === 'v2ray')
			{
				const v2rayConfigPath = path.join(config.CONFIG_DIR, 'v2ray.toml');
				const v2rayConfigContent = fs.readFileSync(v2rayConfigPath, 'utf8');
				this.nodeConfig.vpn_port = parseInt(this.extractConfigValue(v2rayConfigContent, 'listen_port'));
			}
			
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
		const regex = new RegExp(`^${key}\\s*=\\s*"?([^"\\r\\n]*)"?`, 'm');
		const match = content.match(regex);
		// Return the value if found, otherwise an empty string
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
		// Create a regex to match the section
		const sectionRegex = new RegExp(`\\[${section}\\]([\\s\\S]*?)\\[`, 'm');
		const sectionMatch = content.match(sectionRegex);
		// If the section is found, extract the key value
		if(sectionMatch)
		{
			// Create a regex to match the key
			const keyRegex = new RegExp(`^${key}\\s*=\\s*"?([^"\\r\\n]*)"?`, 'm');
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
		const configFilePath = path.join(config.CONFIG_DIR, 'config.toml');
		
		try
		{
			this.updateConfigValue(configFilePath, 'moniker', this.nodeConfig.moniker);
			this.updateConfigValue(configFilePath, 'id', this.nodeConfig.chain_id);
			this.updateConfigValue(configFilePath, 'rpc_addresses', this.nodeConfig.rpc_addresses);
			this.updateConfigValue(configFilePath, 'type', this.nodeConfig.node_type);
			this.updateConfigValue(configFilePath, 'listen_on', `0.0.0.0:${this.nodeConfig.node_port}`);
			this.updateConfigValue(configFilePath, 'remote_url', `https://${this.nodeConfig.node_ip}:${this.nodeConfig.node_port}`);
			this.updateConfigValue(configFilePath, 'backend', this.nodeConfig.backend);
			this.updateConfigValueInSection(configFilePath, 'handshake', 'enable', this.nodeConfig.handshake ? 'true' : 'false');
			this.updateConfigValue(configFilePath, 'max_peers', this.nodeConfig.max_peers);
			this.updateConfigValue(configFilePath, 'gas', this.nodeConfig.gas);
			this.updateConfigValue(configFilePath, 'gas_adjustment', this.nodeConfig.gas_adjustment);
			this.updateConfigValue(configFilePath, 'gas_prices', this.nodeConfig.gas_prices);
			
			if(this.nodeConfig.node_type === 'wireguard')
			{
				const wireguardConfigPath = path.join(config.CONFIG_DIR, 'wireguard.toml');
				this.updateConfigValue(wireguardConfigPath, 'listen_port', this.nodeConfig.vpn_port);
			}
			else if(this.nodeConfig.node_type === 'v2ray')
			{
				const v2rayConfigPath = path.join(config.CONFIG_DIR, 'v2ray.toml');
				this.updateConfigValue(v2rayConfigPath, 'listen_port', this.nodeConfig.vpn_port);
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
	private updateConfigValue(filePath: string, key: string, value: string | number): void
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
	
	/**
	 * Create node configuration file
	 * @returns boolean
	 */
	public async createNodeConfig(): Promise<boolean>
	{
		// Create configuration file
		const output: string|null = await containerCommand(['process', 'config', 'init']);
		
		// Return if the configuration file has been created
		if(output !== null && output === '')
			return true
		else
		{
			Logger.error(`Failed to create node configuration file: ${output?.trim()}`);
			return false;
		}
	}
	
	/**
	 * Create VPN configuration file
	 * @returns boolean
	 */
	public async createVpnConfig(): Promise<boolean>
	{
		let output: string|null = '';
		
		// Create WireGuard configuration file
		if(this.nodeConfig.node_type === 'wireguard')
		{
			output = await containerCommand(['process', 'wireguard', 'config', 'init']);
		}
		// Create V2Ray configuration file
		else if(this.nodeConfig.node_type === 'v2ray')
		{
			output = await containerCommand(['process', 'v2ray', 'config', 'init']);
		}
		
		// Return if the configuration file has been created
		if(output !== null && output === '')
			return true
		else
		{
			Logger.error(`Failed to create VPN configuration file: ${output?.trim()}`);
			return false;
		}
	}
	
	public async walletExists(): Promise<boolean>
	{
		let stdin: string[]|null = null
		
		// If the backend is file, add the passphrase to the stdin
		if(this.nodeConfig.backend === 'file')
			stdin = [this.nodeConfig.walletPassphrase];
		
		// List all wallet keys
		const output: string|null = await containerCommand(['process', 'keys', 'list'], stdin);
		
		// Return if the wallet exists
		return output !== null && output.includes(this.nodeConfig.wallet_name);
	}
	
	/**
	 * Remove wallet keys
	 * @returns boolean
	 */
	public async walletRemove(): Promise<boolean>
	{
		// If wallet does not exist, return false
		if(!await this.walletExists())
			return true;
		
		let stdin: string[]|null = null
		
		// If the backend is file, add the passphrase to the stdin
		if(this.nodeConfig.backend === 'file')
			stdin = [this.nodeConfig.walletPassphrase];
		
		// Remove wallet keys
		const output: string|null = await containerCommand(['process', 'keys', 'delete', this.nodeConfig.wallet_name], stdin);
		
		// Return if the wallet has been removed
		return output === '';
	}
}

// Create a singleton instance of NodeManager
const nodeManager = NodeManager.getInstance();
export default nodeManager;

// Export utility functions
export const nodeConfig = (): NodeConfigData => nodeManager.getConfig();
export const isNodeConfigFileAvailable = (): boolean => nodeManager.isConfigFileAvailable(path.join(config.CONFIG_DIR, 'config.toml'));
export const isWireguardConfigFileAvailable = (): boolean => nodeManager.isConfigFileAvailable(path.join(config.CONFIG_DIR, 'wireguard.toml'));
export const isV2RayConfigFileAvailable = (): boolean => nodeManager.isConfigFileAvailable(path.join(config.CONFIG_DIR, 'v2ray.toml'));
export const createNodeConfig = (): Promise<boolean> => nodeManager.createNodeConfig();
export const createVpnConfig = (): Promise<boolean> => nodeManager.createVpnConfig();
export const walletExists = (): Promise<boolean> => nodeManager.walletExists();
export const walletRemove = (): Promise<boolean> => nodeManager.walletRemove();