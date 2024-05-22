import Docker from 'dockerode';
import config from './configuration';
import { Logger } from './logger';

const docker = new Docker();

/**
 * Check if the Docker image is available locally
 * @return boolean
 */
export async function checkImageAvailability(): Promise<boolean>
{
	try
	{
		const imageName = config.DOCKER_IMAGE_NAME;
		const images = await docker.listImages();
		const imageExists = images.some(image => image.RepoTags && image.RepoTags.includes(imageName));
		return imageExists;
	}
	catch (err)
	{
		Logger.error(`Error while checking Docker image:\n${err?.toString()}`);
	}
	
	return false;
}

/**
 * Inspect the Docker container
 * 
 * @returns Docker.ContainerInspectInfo | null
 */
export async function inspectDockerContainer(): Promise<Docker.ContainerInspectInfo | null>
{
	try
	{
		const containerName = config.DOCKER_CONTAINER_NAME;
		const containerInfo = await docker.getContainer(containerName).inspect();
		return containerInfo;
	}
	catch (err)
	{
		Logger.error(`Error while inspecting Docker container ${config.DOCKER_CONTAINER_NAME}:\n${err?.toString()}`);
	}
	
	return null;
}

export async function checkContainerExists(): Promise<boolean>
{
	try
	{
		const containerName = config.DOCKER_CONTAINER_NAME;
		const containers = await docker.listContainers({ all: true });
		const containerExists = containers.some(container => container.Names.includes(`/${containerName}`));
		return containerExists;
	}
	catch (err)
	{
		Logger.error(`Error while checking if container ${config.DOCKER_CONTAINER_NAME} exists:\n${err?.toString()}`);
	}

	return false;
}