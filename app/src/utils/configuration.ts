import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { Logger } from '@utils/logger';

export interface ConfigData
{
	[key: string]: string | number | boolean | undefined;
	BLENO_DEVICE_NAME: string;
}

class ConfigurationLoader
{
	private static instance: ConfigurationLoader;
	private configFile = '/etc/casanode.conf';
	private config: ConfigData;
	
	// Default configuration
	private defaultConfig: ConfigData = {
		BLENO_DEVICE_NAME: 'Casanode',
	};
	
	private constructor()
	{
		this.config = this.loadConfig();
	}
	
	/**
	 * Get instance of ConfigurationLoader
	 * @returns ConfigurationLoader
	 */
	public static getInstance(): ConfigurationLoader
	{
		// Create instance if it does not exist
		if(!ConfigurationLoader.instance)
			ConfigurationLoader.instance = new ConfigurationLoader();
		// Return instance
		return ConfigurationLoader.instance;
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
	 * Load configuration from file and merge it with default configuration
	 */
	private loadConfig(): ConfigData
	{
		const configFromFile = this.loadConfigFromFile();
		// Merge default and file configurations
		const mergedConfig = { ...this.defaultConfig, ...configFromFile };
		// Filter out undefined values
		const filteredConfig = Object.keys(mergedConfig).reduce((acc, key) =>
		{
			const value = mergedConfig[key];
			if(value !== undefined)
			{
				acc[key] = value;
			}
			return acc;
		}, {} as ConfigData);
		// Save filtered configuration
		return filteredConfig;
	}
	
	/**
	 * Load configuration from file
	 * @returns Partial<ConfigData>
	 */
	private loadConfigFromFile(): Partial<ConfigData>
	{
		try
		{
			if(fs.existsSync(this.configFile))
			{
				const config = dotenv.parse(fs.readFileSync(this.configFile));
				return config as Partial<ConfigData>;
			}
			else
			{
				Logger.error(`Configuration file ${this.configFile} does not exist. Using default values.`);
				return {};
			}
		}
		catch (error)
		{
			Logger.error(`An error occurred while loading configuration file: ${error}`);
			return {};
		}
	}
}

// Exporter une instance unique de ConfigurationLoader
const configurationLoader = ConfigurationLoader.getInstance();
export default configurationLoader.getConfig();
