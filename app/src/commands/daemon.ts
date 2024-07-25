import { createRequire } from 'module';
import { Logger } from '@utils/logger';
import config from '@utils/configuration';
import WebServer from '@utils/web';
import { loadingNodeInformations, loadingSystemInformations } from '@actions/startup';

import { HelloCharacteristic } from '@characteristics/hello';
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

// Bluetooth UUIDs
const NODE_BLE_UUID = '00805f9b34fb';
const CHAR_HELLO_UUID = '00805f9b34fc';
const CHAR_MONIKER_UUID = '00805f9b34fd';
const CHAR_NODE_TYPE_UUID = '00805f9b34fe';
const CHAR_NODE_IP_UUID = '00805f9b34ff';
const CHAR_NODE_PORT_UUID = '00805f9b3500';
const CHAR_VPN_TYPE_UUID = '00805f9b3501';
const CHAR_VPN_PORT_UUID = '00805f9b3502';
const CHAR_MAX_PEERS_UUID = '00805f9b3503';
const CHAR_NODE_CONFIG_UUID = '00805f9b3504';
const CHAR_NODE_LOCATION_UUID = '00805f9b3505';
const CHAR_CERT_EXPIRITY_UUID = '00805f9b3506';
const CHAR_BANDWIDTH_SPEED_UUID = '00805f9b3507';
const CHAR_SYSTEM_UPTIME_UUID = '00805f9b3508';
const CHAR_CASANODE_VERSION_UUID = '00805f9b3509';
const CHAR_DOCKER_IMAGE_UUID = '00805f9b350a';
const CHAR_SYSTEM_OS_UUID = '00805f9b350b';
const CHAR_SYSTEM_ARCH_UUID = '00805f9b350c';
const CHAR_SYSTEM_KERNEL_UUID = '00805f9b350d';
const CHAR_NODE_PASSPHRASE_UUID = '00805f9b350e';
const CHAR_PUBLIC_ADDRESS_UUID = '00805f9b350f';
const CHAR_ADDRESS_NODE_UUID = '00805f9b3510';
const CHAR_NODE_BALANCE_UUID = '00805f9b3511';
const CHAR_NODE_STATUS_UUID = '00805f9b3512';
const CHAR_CHECK_INSTALL_UUID = '00805f9b3513';
const CHAR_INSTALL_IMAGE_UUID = '00805f9b3514';
const CHAR_INSTALL_CONFIGS_UUID = '00805f9b3515';
const CHAR_NODE_ACTIONS_UUID = '00805f9b3516';
const CHAR_SYSTEM_ACTIONS_UUID = '00805f9b3517';
const CHAR_CERTIFICATE_ACTIONS_UUID = '00805f9b3518';
const CHAR_WALLET_MNEMONIC_UUID = '00805f9b3519';
const CHAR_WALLET_ACTIONS_UUID = '00805f9b351a';
const CHAR_NODE_KEYRING_BACKEND_UUID = '00805f9b351b';

export const daemonCommand = async () =>
{
	console.log('Daemon process started');
	Logger.info('Daemon process started.');
	
	// Load the system information
	await loadingSystemInformations();
	
	// Load the node information
	await loadingNodeInformations();
	
	// Dynamically import the Bleno module using CommonJS require
	const require = createRequire(import.meta.url);
	const bleno = require('bleno');
	
	// Create the primary service with the specified UUID and characteristics
	const service = new bleno.PrimaryService({
		uuid: `${config.BLE_UUID}-${NODE_BLE_UUID}`,
		characteristics: [
			HelloCharacteristic.create(`${config.BLE_UUID}-${CHAR_HELLO_UUID}`),
			new MonikerCharacteristic(`${config.BLE_UUID}-${CHAR_MONIKER_UUID}`).create(),
			new NodeTypeCharacteristic(`${config.BLE_UUID}-${CHAR_NODE_TYPE_UUID}`).create(),
			new NodeIpCharacteristic(`${config.BLE_UUID}-${CHAR_NODE_IP_UUID}`).create(),
			new NodePortCharacteristic(`${config.BLE_UUID}-${CHAR_NODE_PORT_UUID}`).create(),
			new VpnTypeCharacteristic(`${config.BLE_UUID}-${CHAR_VPN_TYPE_UUID}`).create(),
			new VpnPortCharacteristic(`${config.BLE_UUID}-${CHAR_VPN_PORT_UUID}`).create(),
			new MaxPeersCharacteristic(`${config.BLE_UUID}-${CHAR_MAX_PEERS_UUID}`).create(),
			new NodeConfigCharacteristic(`${config.BLE_UUID}-${CHAR_NODE_CONFIG_UUID}`).create(),
			new NodeLocationCharacteristic(`${config.BLE_UUID}-${CHAR_NODE_LOCATION_UUID}`).create(),
			new CertExpirityCharacteristic(`${config.BLE_UUID}-${CHAR_CERT_EXPIRITY_UUID}`).create(),
			new BandwidthSpeedCharacteristic(`${config.BLE_UUID}-${CHAR_BANDWIDTH_SPEED_UUID}`).create(),
			new SystemUptimeCharacteristic(`${config.BLE_UUID}-${CHAR_SYSTEM_UPTIME_UUID}`).create(),
			new CasanodeVersionCharacteristic(`${config.BLE_UUID}-${CHAR_CASANODE_VERSION_UUID}`).create(),
			new DockerImageCharacteristic(`${config.BLE_UUID}-${CHAR_DOCKER_IMAGE_UUID}`).create(),
			new SystemArchCharacteristic(`${config.BLE_UUID}-${CHAR_SYSTEM_ARCH_UUID}`).create(),
			new SystemOsCharacteristic(`${config.BLE_UUID}-${CHAR_SYSTEM_OS_UUID}`).create(),
			new SystemKernelCharacteristic(`${config.BLE_UUID}-${CHAR_SYSTEM_KERNEL_UUID}`).create(),
			new NodePassphraseCharacteristic(`${config.BLE_UUID}-${CHAR_NODE_PASSPHRASE_UUID}`).create(),
			new PublicAddressCharacteristic(`${config.BLE_UUID}-${CHAR_PUBLIC_ADDRESS_UUID}`).create(),
			new NodeAddressCharacteristic(`${config.BLE_UUID}-${CHAR_ADDRESS_NODE_UUID}`).create(),
			new NodeBalanceCharacteristic(`${config.BLE_UUID}-${CHAR_NODE_BALANCE_UUID}`).create(),
			new NodeStatusCharacteristic(`${config.BLE_UUID}-${CHAR_NODE_STATUS_UUID}`).create(),
			new CheckInstallationCharacteristic(`${config.BLE_UUID}-${CHAR_CHECK_INSTALL_UUID}`).create(),
			new InstallDockerImageCharacteristic(`${config.BLE_UUID}-${CHAR_INSTALL_IMAGE_UUID}`).create(),
			new InstallConfigsCharacteristic(`${config.BLE_UUID}-${CHAR_INSTALL_CONFIGS_UUID}`).create(),
			new NodeActionsCharacteristic(`${config.BLE_UUID}-${CHAR_NODE_ACTIONS_UUID}`).create(),
			new SystemActionsCharacteristic(`${config.BLE_UUID}-${CHAR_SYSTEM_ACTIONS_UUID}`).create(),
			new CertificateActionsCharacteristic(`${config.BLE_UUID}-${CHAR_CERTIFICATE_ACTIONS_UUID}`).create(),
			new NodeMnemonicCharacteristic(`${config.BLE_UUID}-${CHAR_WALLET_MNEMONIC_UUID}`).create(),
			new WalletActionsCharacteristic(`${config.BLE_UUID}-${CHAR_WALLET_ACTIONS_UUID}`).create(),
			new NodeKeyringBackendCharacteristic(`${config.BLE_UUID}-${CHAR_NODE_KEYRING_BACKEND_UUID}`).create(),
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
			Logger.info('Application started successfully.');
			bleno.startAdvertising('Casanode', [NODE_BLE_UUID]);
		}
		else
		{
			Logger.info('Application stopped.');
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
	
	// Start the web server
	const webServer = WebServer.getInstance();
	webServer.start();
};
