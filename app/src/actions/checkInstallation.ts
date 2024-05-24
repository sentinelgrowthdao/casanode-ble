import {
	checkImageAvailability,
	checkContainerExists,
	containerRunning,
} from '@utils/docker';

import {
	isNodeConfigFileAvailable,
	isWireguardConfigFileAvailable,
	isV2RayConfigFileAvailable,
} from '@utils/node';

export interface InstallationCheck
{
	image: boolean;
	containerExists: boolean;
	containerRunning: boolean;
	sentinelConfig: boolean;
	wireguardConfig: boolean;
	v2rayConfig: boolean;
};

export const checkInstallation = async (): Promise<InstallationCheck> =>
{
	return {
		image: await checkImageAvailability(),
		containerExists: await checkContainerExists(),
		containerRunning: await containerRunning(),
		sentinelConfig: isNodeConfigFileAvailable(),
		wireguardConfig: isWireguardConfigFileAvailable(),
		v2rayConfig: isV2RayConfigFileAvailable(),
	};
};
