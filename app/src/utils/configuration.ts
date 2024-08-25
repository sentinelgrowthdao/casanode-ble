import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '@utils/logger';

export interface AppConfigData
{
	[key: string]: string | number | boolean | string[] | undefined;
	BLENO_DEVICE_NAME: string;
	DOCKER_IMAGE_NAME: string;
	DOCKER_CONTAINER_NAME: string;
	CONFIG_DIR: string;
	LOG_DIR: string;
	DOCKER_SOCKET: string;
	BLE_UUID: string;
	WEB_LISTEN: string;
	API_BALANCE: string[];
	FOXINODES_API_CHECK_IP: string;
	FOXINODES_API_DVPN_CONFIG: string;
	FOXINODES_API_CHECK_PORT: string;
}

export interface ConfigFileData
{
	[key: string]: string;
}

export interface RemoteAddressData
{
	ip: string;
	country: string;
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
		CONFIG_DIR: process.env.HOME ? path.join(process.env.HOME, '.sentinelnode') : '/opt/casanode/.sentinelnode',
		LOG_DIR: '/var/log/casanode',
		DOCKER_SOCKET: this.getDockerDefaultSocketPath(),
		BLE_UUID: this.generateBluetoothUuid(),
		WEB_LISTEN: '0.0.0.0:8080',
		API_BALANCE: [
			"https://api-sentinel.busurnode.com/cosmos/bank/v1beta1/balances/",
			"https://api.sentinel.quokkastake.io/cosmos/bank/v1beta1/balances/",
			"https://wapi.foxinodes.net/api/v1/sentinel/address/"
		],
		FOXINODES_API_CHECK_IP: "https://wapi.foxinodes.net/api/v1/sentinel/check-ip",
		FOXINODES_API_DVPN_CONFIG: "https://wapi.foxinodes.net/api/v1/sentinel/dvpn-node/configuration",
		FOXINODES_API_CHECK_PORT: "https://wapi.foxinodes.net/api/v1/sentinel/dvpn-node/check-port/",
	};
	
	private constructor()
	{
		this.config = this.loadConfig();
		this.saveConfig();
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
	 * Reset the node configuration
	 * @returns void
	 */
	public resetConfiguration(): void
	{
		this.config = { ...this.defaultConfig };
		this.saveConfig();
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
				// Parse configuration file
				const config: ConfigFileData = dotenv.parse(fs.readFileSync(this.configFile));
				const parsedConfig: Partial<AppConfigData> = {};
				
				// Manually parse arrays
				for (const key in config)
				{
					let value = config[key];
					
					// Skip keys with empty values
					if (!value.trim()) {
						continue;
					}
					
					// Check if value is an array
					if(value.startsWith('[') && value.endsWith(']'))
					{
						parsedConfig[key] = value
							.slice(1, -1)
							.split(',')
							.map(item => item.trim());
					}
					else
					{
						parsedConfig[key] = value;
					}
				}
				return parsedConfig;
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
	
	/**
	 * Save configuration to file
	 * @returns boolean
	 */
	public saveConfig(): boolean
	{
		try
		{
			const configData = Object.entries(this.config)
				.map(([key, value]) =>
				{
					if(Array.isArray(value))
					{
						const arrayValues = value.join(',');
						return `${key}=[${arrayValues}]`;
					}
					else
					{
						return `${key}=${value}`;
					}
				})
				.join('\n');
			fs.writeFileSync(this.configFile, configData);
			return true;
		}
		catch(error)
		{
			Logger.error(`An error occurred while saving configuration file: ${error}`);
			return false;
		}
	}
	
	
	/**
	 * Get remote address
	 * @returns Promise<RemoteAddressData>
	 */
	public async getRemoteAddress(): Promise<RemoteAddressData>
	{
		// Initialize default values
		let nodeIP = "0.0.0.0";
		let nodeCountry = "NA";
		
		try
		{
			// Attempt to get the IP and country from the primary API
			const response = await axios.get(this.config.FOXINODES_API_CHECK_IP, { timeout: 60000 });
			if(response.status === 200)
			{
				const data = response.data;
				nodeIP = data.ip || nodeIP;
				nodeCountry = data.iso_code || nodeCountry;
			}
			else
			{
				Logger.error("Failed to fetch IP from primary API.");
			}
		}
		catch (error)
		{
			Logger.error(`Primary API call failed: ${error}. Trying fallback method.`);
			try
			{
				// Fallback to checkip.dyndns.org
				const response = await axios.get("http://checkip.dyndns.org/", { timeout: 60000 });
				if(response.status === 200)
				{
					const value = response.data;
					nodeIP = value.split("Current IP Address: ")[1].split("<")[0];
				}
				else
				{
					Logger.error("Failed to fetch IP from fallback method.");
				}
			}
			catch (fallbackError)
			{
				Logger.error(`Fallback method also failed: ${fallbackError}.`);
			}
		}
		
		// Return IP and country
		return {
			ip: nodeIP,
			country: nodeCountry
		};
	}
	
	/**
	 * Refresh network configuration from the API
	 * @returns Promise<boolean>
	 */
	public async refreshNetworkConfiguration(): Promise<boolean>
	{
		try
		{
			// Fetch the configuration from the API
			const response = await axios.get(this.config.FOXINODES_API_DVPN_CONFIG, { timeout: 60000 });
			if(response.status === 200)
			{
				const data = response.data;
				// Check if the data is valid
				if(data && data.error === false)
				{
					// Extract the configuration data
					const chainId = data.chain_id;
					const rpcAddresses = data.rpc_addresses;
					const gas = data.gas;
					const gasAdjustment = data.gas_adjustment;
					const gasPrice = data.gas_price;
					const datacenterGigabytePrices = data.datacenter.gigabyte_prices;
					const datacenterHourlyPrices = data.datacenter.hourly_prices;
					const residentialGigabytePrices = data.residential.gigabyte_prices;
					const residentialHourlyPrices = data.residential.hourly_prices;
					
					// Update the configuration
					this.config = {
						...this.config,
						CHAIN_ID: chainId,
						RPC_ADDRESSES: rpcAddresses,
						GAS: gas,
						GAS_ADJUSTMENT: gasAdjustment,
						GAS_PRICE: gasPrice,
						DATACENTER_GIGABYTE_PRICES: datacenterGigabytePrices,
						DATACENTER_HOURLY_PRICES: datacenterHourlyPrices,
						RESIDENTIAL_GIGABYTE_PRICES: residentialGigabytePrices,
						RESIDENTIAL_HOURLY_PRICES: residentialHourlyPrices
					};
					
					// Log
					Logger.info("Network configuration has been refreshed.");
					return true;
				}
				else
				{
					Logger.error("Invalid network configuration data.");
				}
			}
			else
			{
				Logger.error("Failed to fetch network configuration.");
			}
		}
		catch (err)
		{
			if (err instanceof Error)
				Logger.error(`Failed to refresh network configuration: ${err.message}`);
			else
				Logger.error(`Failed to refresh network configuration: ${String(err)}`);
		}
		
		return false;
	}
	
	/**
	 * Get the default path for the Docker socket
	 * @returns string
	 */
	public getDockerDefaultSocketPath(): string
	{
		const userInfo = os.userInfo();
		const userId = userInfo.uid;
		return `/run/user/${userId}/docker.sock`;
	}
	
	/**
	 * Generate a Bluetooth UUID
	 * @returns string
	 */
	private generateBluetoothUuid(): string
	{
		// Generate a full UUID
		const uuid = uuidv4();
		// Split the UUID into its components
		const parts = uuid.split('-');
		
		// Use the first three parts and replace the last part with a random 4-character hex string
		const part1 = parts[0];
		const part2 = parts[1];
		const part3 = parts[2];
		const part4 = parts[3];
		
		// Return the formatted UUID
		return `${part1}-${part2}-${part3}-${part4}`;
	}
}


// Exporter une instance unique de ConfigurationLoader
const configurationLoader = ConfigurationLoader.getInstance();
export default configurationLoader.getConfig();

export const getDockerDefaultSocketPath = (): string => configurationLoader.getDockerDefaultSocketPath();
export const getRemoteAddress = async (): Promise<RemoteAddressData> => configurationLoader.getRemoteAddress();
export const refreshNetworkConfiguration = async (): Promise<boolean> => configurationLoader.refreshNetworkConfiguration();
export const resetConfiguration = (): void => configurationLoader.resetConfiguration();