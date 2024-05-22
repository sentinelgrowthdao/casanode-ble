import {
	checkImageAvailability,
	inspectDockerContainer,
	checkContainerExists,
} from '@utils/docker';

import {
	isNodeConfigFileAvailable,
	isWireguardConfigFileAvailable,
	isV2RayConfigFileAvailable,
} from '@utils/node';

export interface InstallationCheck
{
	image: boolean;
	container: boolean;
	sentinelConfig: boolean;
	wireguardConfig: boolean;
	v2rayConfig: boolean;
};

export const checkInstallation = async (): Promise<InstallationCheck> =>
{
	return {
		image: await checkImageAvailability(),
		container: await checkContainerExists(),
		sentinelConfig: isNodeConfigFileAvailable(),
		wireguardConfig: isWireguardConfigFileAvailable(),
		v2rayConfig: isV2RayConfigFileAvailable(),
	};
};
