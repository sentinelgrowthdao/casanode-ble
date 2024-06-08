// import bleno from '@abandonware/bleno'; <- This import stuck the process
// The direct ES6 import of the Bleno module causes the Node.js process to hang indefinitely,
// even when Bleno is not explicitly used. This is likely due to internal asynchronous operations
// or timers initialized by Bleno upon import, which keep the event loop active.

// To avoid this issue, we use the CommonJS require syntax to import Bleno dynamically
// within the function. The createRequire function from the 'module' package allows us
// to use require in an ES6 module context.

import { createRequire } from 'module';	// <- Used to import the Bleno module in the same way as require
import { Logger } from '@utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

import nodeManager from '@utils/node';

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

// TODO: Add the UUIDs for the BLE service and characteristics in the configuration file
const NODE_BLE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
const CHAR_HELLO_UUID = '0000180d-0000-1000-8000-00805f9b34fc';
const CHAR_MONIKER_UUID = '0000180d-0000-1000-8000-00805f9b34fd';
const CHAR_NODE_TYPE_UUID = '0000180d-0000-1000-8000-00805f9b34fe';
const CHAR_NODE_IP_UUID = '0000180d-0000-1000-8000-00805f9b34ff';
const CHAR_NODE_PORT_UUID = '0000180d-0000-1000-8000-00805f9b3500';
const CHAR_VPN_TYPE_UUID = '0000180d-0000-1000-8000-00805f9b3501';
const CHAR_VPN_PORT_UUID = '0000180d-0000-1000-8000-00805f9b3502';
const CHAR_MAX_PEERS_UUID = '0000180d-0000-1000-8000-00805f9b3503';
const CHAR_NODE_CONFIG_UUID = '0000180d-0000-1000-8000-00805f9b3504';
const CHAR_NODE_LOCATION_UUID = '0000180d-0000-1000-8000-00805f9b3505';
const CHAR_CERT_EXPIRITY_UUID = '0000180d-0000-1000-8000-00805f9b3506';
const CHAR_BANDWIDTH_SPEED_UUID = '0000180d-0000-1000-8000-00805f9b3507';
const CHAR_SYSTEM_UPTIME_UUID = '0000180d-0000-1000-8000-00805f9b3508';
const CHAR_CASANODE_VERSION_UUID = '0000180d-0000-1000-8000-00805f9b3509';
const CHAR_DOCKER_IMAGE_UUID = '0000180d-0000-1000-8000-00805f9b350a';
const CHAR_SYSTEM_OS_UUID = '0000180d-0000-1000-8000-00805f9b350b';
const CHAR_SYSTEM_ARCH_UUID = '0000180d-0000-1000-8000-00805f9b350c';
const CHAR_SYSTEM_KERNEL_UUID = '0000180d-0000-1000-8000-00805f9b350d';

export const daemonCommand = async () =>
{
	console.log('Daemon process started');
	Logger.info('Daemon process started.');
	
	// Load the node location
	await nodeManager.refreshNodeLocation();
	
	// Initialize the node uptime
	nodeManager.setSystemUptime(Math.floor(Date.now() / 1000));
	
	// Initialize the system information
	nodeManager.setSystemOs(`${await runCommand('lsb_release -is')} ${await runCommand('lsb_release -rs')}`);
	nodeManager.setSystemKernel(`${await runCommand('uname -r')}`);
	nodeManager.setSystemArch(`${await runCommand('uname -m')}`);
	
	// Dynamically import the Bleno module using CommonJS require
	const require = createRequire(import.meta.url);
	const bleno = require('bleno');
	
	// Create the primary service with the specified UUID and characteristics
	const service = new bleno.PrimaryService({
		uuid: NODE_BLE_UUID,
		characteristics: [
			HelloCharacteristic.create(CHAR_HELLO_UUID),
			new MonikerCharacteristic(CHAR_MONIKER_UUID).create(),
			new NodeTypeCharacteristic(CHAR_NODE_TYPE_UUID).create(),
			new NodeIpCharacteristic(CHAR_NODE_IP_UUID).create(),
			new NodePortCharacteristic(CHAR_NODE_PORT_UUID).create(),
			new VpnTypeCharacteristic(CHAR_VPN_TYPE_UUID).create(),
			new VpnPortCharacteristic(CHAR_VPN_PORT_UUID).create(),
			new MaxPeersCharacteristic(CHAR_MAX_PEERS_UUID).create(),
			new NodeConfigCharacteristic(CHAR_NODE_CONFIG_UUID).create(),
			new NodeLocationCharacteristic(CHAR_NODE_LOCATION_UUID).create(),
			new CertExpirityCharacteristic(CHAR_CERT_EXPIRITY_UUID).create(),
			new BandwidthSpeedCharacteristic(CHAR_BANDWIDTH_SPEED_UUID).create(),
			new SystemUptimeCharacteristic(CHAR_SYSTEM_UPTIME_UUID).create(),
			new CasanodeVersionCharacteristic(CHAR_CASANODE_VERSION_UUID).create(),
			new DockerImageCharacteristic(CHAR_DOCKER_IMAGE_UUID).create(),
			new SystemArchCharacteristic(CHAR_SYSTEM_ARCH_UUID).create(),
			new SystemOsCharacteristic(CHAR_SYSTEM_OS_UUID).create(),
			new SystemKernelCharacteristic(CHAR_SYSTEM_KERNEL_UUID).create(),
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
};

/**
 * Run a command asynchronously
 * @param command string
 * @returns string
 */
async function runCommand(command: string): Promise<string>
{
	const { stdout, stderr } = await execPromise(command);
	return stdout.trim() || '';
}