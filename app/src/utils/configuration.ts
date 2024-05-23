import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Logger } from '@utils/logger';

export interface AppConfigData
{
	[key: string]: string | number | boolean | undefined;
	BLENO_DEVICE_NAME: string;
	DOCKER_IMAGE_NAME: string;
	DOCKER_CONTAINER_NAME: string;
	CONFIG_DIR: string;
}

class ConfigurationLoader
{
	private static instance: ConfigurationLoader;
	private configFile = '/etc/casanode.conf';
	private config: AppConfigData;
	
	// Default configuration
	private defaultConfig: AppConfigData =
	{
		BLENO_DEVICE_NAME: 'Casanode',
		DOCKER_IMAGE_NAME: 'wajatmaka/sentinel-aarch64-alpine:v0.7.1',
		DOCKER_CONTAINER_NAME: 'sentinel-dvpn-node',
		CONFIG_DIR: process.env.HOME ? path.join(process.env.HOME, '.sentinelnode') : '/default/path/.sentinelnode',
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
	 * @returns AppConfigData
	 */
	public getConfig(): AppConfigData
	{
		return this.config;
	}
	
	/**
	 * Load configuration from file and merge it with default configuration
	 */
	private loadConfig(): AppConfigData
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
		}, {} as AppConfigData);
		// Save filtered configuration
		return filteredConfig;
	}
	
	/**
	 * Load configuration from file
	 * @returns Partial<AppConfigData>
	 */
	private loadConfigFromFile(): Partial<AppConfigData>
	{
		try
		{
			if(fs.existsSync(this.configFile))
			{
				const config = dotenv.parse(fs.readFileSync(this.configFile));
				return config as Partial<AppConfigData>;
			}
			else
			{
				Logger.error(`Configuration file ${this.configFile} does not exist. Using default values.`);
				return {};
			}
		}
		catch(error)
		{
			Logger.error(`An error occurred while loading configuration file: ${error}`);
			return {};
		}
	}
}

// Exporter une instance unique de ConfigurationLoader
const configurationLoader = ConfigurationLoader.getInstance();
export default configurationLoader.getConfig();
