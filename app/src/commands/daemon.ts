import { createRequire } from 'module';
import { Logger } from '@utils/logger';
import config from '@utils/configuration';
import WebServer from '@utils/web';
import { v5 as uuidv5 } from 'uuid';
import { loadingNodeInformations, loadingSystemInformations } from '@actions/startup';
import { isBluetoothAvailable } from '@utils/bluetooth';

import { DiscoveryCharacteristic } from '@characteristics/discovery';
import { MonikerCharacteristic } from '@characteristics/moniker';
import { NodeTypeCharacteristic } from '@characteristics/nodeType';
import { NodeIpCharacteristic } from '@/characteristics/nodeIp';
import { NodePortCharacteristic } from '@/characteristics/nodePort';
import { VpnTypeCharacteristic } from '@/characteristics/vpnType';
import { VpnPortCharacteristic } from '@/characteristics/vpnPort';
import { MaxPeersCharacteristic } from '@/characteristics/maxPeers';
import { NodeConfigCharacteristic } from '@/characteristics/nodeConfig';
import { NodeLocationCharacteristic } from '@/characteristics/nodeLocation';
import { CertExpirityCharacteristic } from '@/characteristics/certExpirity';
import { BandwidthSpeedCharacteristic } from '@/characteristics/bandwidthSpeed';
import { SystemUptimeCharacteristic } from '@/characteristics/systemUptime';
import { CasanodeVersionCharacteristic } from '@/characteristics/casanodeVersion';
import { DockerImageCharacteristic } from '@/characteristics/dockerImage';
import { SystemArchCharacteristic } from '@/characteristics/systemArch';
import { SystemOsCharacteristic } from '@/characteristics/systemOs';
import { SystemKernelCharacteristic } from '@/characteristics/systemKernel';
import { NodePassphraseCharacteristic } from '@/characteristics/nodePassphrase';
import { PublicAddressCharacteristic } from '@/characteristics/publicAddress';
import { NodeAddressCharacteristic } from '@/characteristics/nodeAddress';
import { NodeBalanceCharacteristic } from '@/characteristics/nodeBalance';
import { NodeStatusCharacteristic } from '@/characteristics/nodeStatus';
import { CheckInstallationCharacteristic } from '@/characteristics/checkInstallation';
import { InstallDockerImageCharacteristic } from '@/characteristics/installDockerImage';
import { InstallConfigsCharacteristic } from '@/characteristics/installConfigs';
import { NodeActionsCharacteristic } from '@/characteristics/nodeActions';
import { SystemActionsCharacteristic } from '@/characteristics/systemActions';
import { CertificateActionsCharacteristic } from '@/characteristics/certificateActions';
import { NodeMnemonicCharacteristic } from '@/characteristics/nodeMnemonic';
import { WalletActionsCharacteristic } from '@/characteristics/walletActions';
import { NodeKeyringBackendCharacteristic } from '@/characteristics/nodeKeyringBackend';
import { OnlineUsersCharacteristic } from '@/characteristics/onlineUsers';
import { VpnChangeTypeCharacteristic } from '@/characteristics/vpnChangeConfig';
import { CheckPortCharacteristic } from '@/characteristics/checkPort';


/**
 * Generate a UUID from a seed and a characteristic ID
 * @param characteristicId string
 * @returns string
 */
function generateUUIDFromSeed(characteristicId: string) : string
{
	return uuidv5(`${config.BLE_CHARACTERISTIC_SEED}+${characteristicId}`, uuidv5.URL);
}

/**
 * Daemon command
 * @returns void
 */
export const daemonCommand = async () =>
{
	console.log('Daemon process started');
	Logger.info('Daemon process started.');
	
	// Load system information
	await loadingSystemInformations();
	
	// Load node information
	await loadingNodeInformations();
	
	// Get the web server instance
	const webServer = WebServer.getInstance();
	// Initialize SSL and routes
	await webServer.init();
	// Start the web server
	webServer.start();
	
	// Check if Bluetooth is available
	const bluetoothAvailable = await isBluetoothAvailable();
	// If Bluetooth is not available, log a info and exit the initialization
	if (!bluetoothAvailable)
	{
		console.warn('No Bluetooth controller found. Continuing without Bluetooth support.');
		Logger.info('No Bluetooth controller found. Continuing without Bluetooth support.');
		// Exit the Bluetooth initialization if no antenna is found
		return;
	}
	
	// Check if the Bluetooth is disabled
	if(config.BLE_ENABLED === 'false')
	{
		console.log('Bluetooth is disabled. Exiting Bluetooth initialization.');
		Logger.info('Bluetooth is disabled. Exiting Bluetooth initialization.');
		// Exit the Bluetooth initialization if it is disabled
		return;
	}
	
	// Dynamically import the Bleno module using CommonJS require
	const require = createRequire(import.meta.url);
	const bleno = require('bleno');
	
	// Create a new primary service with the UUID and characteristics
	const service = new bleno.PrimaryService({
		uuid: `${config.BLE_UUID}`,
		characteristics: [
			new DiscoveryCharacteristic(`${config.BLE_DISCOVERY_UUID}`).create(),
			new MonikerCharacteristic(generateUUIDFromSeed('moniker')).create(),
			new NodeTypeCharacteristic(generateUUIDFromSeed('node-type')).create(),
			new NodeIpCharacteristic(generateUUIDFromSeed('node-ip')).create(),
			new NodePortCharacteristic(generateUUIDFromSeed('node-port')).create(),
			new VpnTypeCharacteristic(generateUUIDFromSeed('vpn-type')).create(),
			new VpnPortCharacteristic(generateUUIDFromSeed('vpn-port')).create(),
			new MaxPeersCharacteristic(generateUUIDFromSeed('max-peers')).create(),
			new NodeConfigCharacteristic(generateUUIDFromSeed('node-config')).create(),
			new NodeLocationCharacteristic(generateUUIDFromSeed('node-location')).create(),
			new CertExpirityCharacteristic(generateUUIDFromSeed('cert-expirity')).create(),
			new BandwidthSpeedCharacteristic(generateUUIDFromSeed('bandwidth-speed')).create(),
			new SystemUptimeCharacteristic(generateUUIDFromSeed('system-uptime')).create(),
			new CasanodeVersionCharacteristic(generateUUIDFromSeed('casanode-version')).create(),
			new DockerImageCharacteristic(generateUUIDFromSeed('docker-image')).create(),
			new SystemArchCharacteristic(generateUUIDFromSeed('system-arch')).create(),
			new SystemOsCharacteristic(generateUUIDFromSeed('system-os')).create(),
			new SystemKernelCharacteristic(generateUUIDFromSeed('system-kernel')).create(),
			new NodePassphraseCharacteristic(generateUUIDFromSeed('node-passphrase')).create(),
			new PublicAddressCharacteristic(generateUUIDFromSeed('public-address')).create(),
			new NodeAddressCharacteristic(generateUUIDFromSeed('node-address')).create(),
			new NodeBalanceCharacteristic(generateUUIDFromSeed('node-balance')).create(),
			new NodeStatusCharacteristic(generateUUIDFromSeed('node-status')).create(),
			new CheckInstallationCharacteristic(generateUUIDFromSeed('check-installation')).create(),
			new InstallDockerImageCharacteristic(generateUUIDFromSeed('install-docker-image')).create(),
			new InstallConfigsCharacteristic(generateUUIDFromSeed('install-configs')).create(),
			new NodeActionsCharacteristic(generateUUIDFromSeed('node-actions')).create(),
			new SystemActionsCharacteristic(generateUUIDFromSeed('system-actions')).create(),
			new CertificateActionsCharacteristic(generateUUIDFromSeed('certificate-actions')).create(),
			new NodeMnemonicCharacteristic(generateUUIDFromSeed('node-mnemonic')).create(),
			new WalletActionsCharacteristic(generateUUIDFromSeed('wallet-actions')).create(),
			new NodeKeyringBackendCharacteristic(generateUUIDFromSeed('node-keyring-backend')).create(),
			new OnlineUsersCharacteristic(generateUUIDFromSeed('online-users')).create(),
			new VpnChangeTypeCharacteristic(generateUUIDFromSeed('vpn-change-type')).create(),
			new CheckPortCharacteristic(generateUUIDFromSeed('check-port')).create(),
		]
	});
	
	/**
	 * Event listener for the stateChange event
	 * @param state string
	 */
	bleno.on('stateChange', (state: any) =>
	{
		// If the state is powered on, start advertising the service
		if (state === 'poweredOn')
		{
			Logger.info('Bluetooth powered on. Application started successfully.');
			bleno.startAdvertising('Casanode', [`${config.BLE_UUID}`]);
		}
		else
		{
			Logger.info('Bluetooth powered off. Stopping advertising.');
			bleno.stopAdvertising();
		}
	});
	
	/**
	 * Event listener for the advertisingStart event
	 * @param error any
	 */
	bleno.on('advertisingStart', (error: any) =>
	{
		if (!error)
		{
			console.log('Advertising...');
			Logger.info('Advertising...');
			// Set the services to be advertised
			bleno.setServices([service]);
		}
		else
		{
			console.error('Advertising failed: ' + error);
			Logger.error('Advertising failed: ' + error);
		}
	});
};
