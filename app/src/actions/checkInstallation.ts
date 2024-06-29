import {
	checkImageAvailability,
	containerExists,
	containerRunning,
} from '@utils/docker';

import {
	nodeConfig,
	isNodeConfigFileAvailable,
	isWireguardConfigFileAvailable,
	isV2RayConfigFileAvailable,
	isCertificateKeyAvailable,
} from '@utils/node';

export interface InstallationCheck
{
	image: boolean;
	containerExists: boolean;
	containerRunning: boolean;
	nodeConfig: boolean;
	vpnConfig: boolean;
	certificateKey: boolean;
};

export const checkInstallation = async (): Promise<InstallationCheck> =>
{
	// Get the node configuration
	const config = nodeConfig();
	// Return the installation check
	return {
		image: await checkImageAvailability(),
		containerExists: await containerExists(),
		containerRunning: await containerRunning(),
		nodeConfig: isNodeConfigFileAvailable(),
		vpnConfig:  config.vpn_type === 'wireguard' ? isWireguardConfigFileAvailable() : isV2RayConfigFileAvailable(),
		certificateKey: isCertificateKeyAvailable(),
	};
};
