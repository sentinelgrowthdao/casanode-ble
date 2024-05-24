import Docker from 'dockerode';
import { Readable } from 'stream';
import config from './configuration';
import { Logger } from './logger';
import { nodeConfig, type NodeConfigData } from '@utils/node';

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

/**
 * Pull Docker image
 * @returns boolean
 */
export async function imagePull(): Promise<boolean>
{
	try
	{
		const imageName = config.DOCKER_IMAGE_NAME;
		const containerName = config.DOCKER_CONTAINER_NAME;
		
		Logger.info(`Pulling Docker image ${imageName}`);
		await new Promise<void>((resolve, reject) =>
		{
			// Pull Docker image
			docker.pull(imageName, (err: any, stream: any) =>
			{
				if (err)
					return reject(err);
				// Follow progress of pulling image
				docker.modem.followProgress(stream, (err, res) =>
				{
					if (err)
						return reject(err);
					
					resolve();
				});
			});
		});
		Logger.info(`Docker image ${imageName} pulled successfully`);
		
		// Tagging the image
		const image = docker.getImage(imageName);
		await image.tag({ repo: containerName });
		
		Logger.info(`Docker image ${imageName} tagged as ${containerName} successfully`);
		
		return true;
	}
	catch (err)
	{
		Logger.error(`Error while pulling Docker image ${config.DOCKER_IMAGE_NAME}:\n${err?.toString()}`);
	}
	
	return false;
}

/**
 * Remove Docker image
 * @param imageName string
 * @returns boolean
 */
async function removeImage(imageName: string): Promise<boolean>
{
	try
	{
		const image: Docker.Image = docker.getImage(imageName);
		Logger.info(`Removing Docker image ${imageName}...`);
		await image.remove({ force: true });
		Logger.info(`Docker image ${imageName} removed successfully.`);
		return true;
	}
	catch (err)
	{
		if (err instanceof Error)
			Logger.error(`Failed to remove Docker image ${imageName}: ${err.message}`);
		else
			Logger.error(`Failed to remove Docker image ${imageName}: ${String(err)}`);
	}
	
	return false;
}

/**
 * Remove Docker images
 * @returns boolean
 */
export async function imagesRemove(): Promise<boolean>
{
	try
	{
		const imageName = config.DOCKER_IMAGE_NAME;
		const containerName = config.DOCKER_CONTAINER_NAME;
		
		const removeOriginal = await removeImage(imageName);
		const removeTagged = await removeImage(containerName);
		
		return removeOriginal && removeTagged;
	}
	catch (err)
	{
		if (err instanceof Error)
			Logger.error(`Failed to remove Docker images: ${err.message}`);
		else
			Logger.error(`Failed to remove Docker images: ${String(err)}`);
	}
	
	return false;
}

/**
 * Start Docker container
 * @param walletPassphrase string|null
 * @returns boolean
 */
export async function containerStart(walletPassphrase: string | null = null): Promise<boolean>
{
	const configNode : NodeConfigData = nodeConfig();
	
	try
	{
		const containerList = await docker.listContainers({ all: true });
		const containerExists = containerList.some(container => container.Names.includes(`/${config.DOCKER_CONTAINER_NAME}`));
		
		if (containerExists)
		{
			const runningContainers = await docker.listContainers();
			const containerRunning = runningContainers.some(container => container.Names.includes(`/${config.DOCKER_CONTAINER_NAME}`));
			
			if (!containerRunning)
			{
				if (configNode.backend === 'file' && walletPassphrase)
				{
					await startContainerWithPassphrase(config.DOCKER_CONTAINER_NAME, walletPassphrase);
				}
				else
				{
					await startContainerWithoutPassphrase(config.DOCKER_CONTAINER_NAME);
				}
				
				Logger.info(`dVPN node container has been started successfully.`);
			}
			return true;
		}
		
		const createOptions =
		{
			name: config.DOCKER_CONTAINER_NAME,
			HostConfig: {
				Binds: [
					`${config.CONFIG_DIR}:/root/.sentinelnode`,
					'/lib/modules:/lib/modules'
				],
				CapDrop: ['ALL'],
				CapAdd: ['NET_ADMIN', 'NET_BIND_SERVICE', 'NET_RAW', 'SYS_MODULE'],
				Sysctls: {
					'net.ipv4.ip_forward': '1',
					'net.ipv6.conf.all.disable_ipv6': '0',
					'net.ipv6.conf.all.forwarding': '1',
					'net.ipv6.conf.default.forwarding': '1'
				},
				PortBindings: {
					[`${configNode.node_port}/tcp`]: [{ HostPort: `${configNode.node_port}` }]
				}
			}
		};
		
		// Add port bindings for WireGuard or V2Ray
		if (configNode.node_type === 'wireguard')
		{
			createOptions.HostConfig.PortBindings[`${configNode.vpn_port}/udp`] = [{ HostPort: `${configNode.vpn_port}` }];
		}
		else if (configNode.nodeType === 'v2ray')
		{
			createOptions.HostConfig.PortBindings[`${configNode.vpn_port}/tcp`] = [{ HostPort: `${configNode.vpn_port}` }];
		}
		else
		{
			Logger.error(`Invalid node type or missing port.`);
			return false;
		}
		
		if (configNode.backend === 'file' && walletPassphrase)
		{
			await startContainerWithPassphrase(config.DOCKER_CONTAINER_NAME, walletPassphrase, createOptions);
		}
		else
		{
			await docker.createContainer({
				...createOptions,
				Image: config.DOCKER_CONTAINER_NAME,
				Cmd: ['process', 'start']
			});
			await startContainerWithoutPassphrase(config.DOCKER_CONTAINER_NAME);
		}
		
		Logger.info(`dVPN node container has been started successfully.`);
		return true;
	}
	catch (err)
	{
		if (err instanceof Error)
			Logger.error(`Failed to start the dVPN node container: ${err.message}`);
		else
			Logger.error(`Failed to start the dVPN node container: ${String(err)}`);

		return false;
	}
}

/**
 * Start Docker container without passphrase
 * @returns boolean
 */
async function startContainerWithoutPassphrase(containerName: string): Promise<void>
{
	await docker.getContainer(containerName).start();
}

/**
 * Start Docker container with passphrase
 * @param containerName string
 * @param walletPassphrase string
 * @param createOptions Docker.ContainerCreateOptions
 * @returns void
 */
async function startContainerWithPassphrase(containerName: string, walletPassphrase: string, createOptions?: Docker.ContainerCreateOptions): Promise<void>
{
	const command = createOptions ? 'create' : 'start';
	const options = createOptions ? createOptions : {};
	
	await new Promise<void>((resolve, reject) =>
	{
		const stream = docker.run(
			containerName,
			['bash', '-c', `echo '${walletPassphrase}' | docker ${command} -ai --detach-keys="ctrl-q" ${containerName}`],
			process.stdout,
			options,
			(err: any) => {
				if (err) return reject(err);
				resolve();
			}
		);
		
		stream.on('data', (data: Buffer) => {
			Logger.info(data.toString());
		});
		
		stream.on('error', (err: any) => {
			Logger.error(`Stream error: ${err}`);
			reject(err);
		});
		
		stream.on('end', () => {
			resolve();
		});
	});
}

/**
 * Stop Docker container
 * @returns boolean
 */
export async function containerStop(): Promise<boolean>
{
	try
	{
		await docker.getContainer(config.DOCKER_CONTAINER_NAME).stop();
		Logger.info(`dVPN node container has been stopped successfully.`);
		return true;
	}
	catch(err)
	{
		if (err instanceof Error)
			Logger.error(`Failed to stop the dVPN node container: ${err.message}`);
		else
			Logger.error(`Failed to stop the dVPN node container: ${String(err)}`);
		
		return false;
	}
}

/**
 * Restart Docker container
 * @returns boolean
 */
export async function containerRestart(): Promise<boolean>
{
	try
	{
		const isRunning = await containerRunning();
		if(isRunning)
		{
			const stopSuccess = await containerStop();
			if (!stopSuccess)
				return false;
		}
		
		const startSuccess = await containerStart();
		if (!startSuccess)
			return false;
		
		Logger.info(`dVPN node container has been restarted successfully.`);
		return true;
	}
	catch (err)
	{
		if (err instanceof Error)
			Logger.error(`Failed to restart the dVPN node container: ${err.message}`);
		else
			Logger.error(`Failed to restart the dVPN node container: ${String(err)}`);
	}
	
	return false;
}

/**
 * Check if the container is running
 * @returns boolean
 */
export async function containerRunning(): Promise<boolean>
{
	try
	{
		const runningContainers = await docker.listContainers();
		const isRunning = runningContainers.some(container => container.Names.includes(`/${config.DOCKER_CONTAINER_NAME}`));
		return isRunning;
	}
	catch (err)
	{
		if (err instanceof Error)
			Logger.error(`Failed to check if the container is running: ${err.message}`);
		else
			Logger.error(`Failed to check if the container is running: ${String(err)}`);
	}

	return false;
}

/**
 * Check if the container exists
 * @returns boolean
 */
export async function containerExists(): Promise<boolean>
{
	try
	{
		const containers = await docker.listContainers({ all: true });
		const containerExists = containers.some(container => container.Names.includes(`/${config.DOCKER_CONTAINER_NAME}`));
		return containerExists;
	}
	catch (err)
	{
		Logger.error(`Error while checking if container ${config.DOCKER_CONTAINER_NAME} exists:\n${err?.toString()}`);
	}

	return false;
}

/**
 * Remove Docker container
 * @returns boolean
 */
export async function containerRemove(): Promise<boolean>
{
	try
	{
		// Check if the container exists
		const exists = await containerExists();
		if (!exists)
			return true;
		
		// Stop the container
		await containerStop();
		
		// Remove the container
		await docker.getContainer(config.DOCKER_CONTAINER_NAME).remove({ force: true });
		Logger.info(`dVPN node container has been removed successfully.`);
		return true;
	}
	catch (err)
	{
		if (err instanceof Error)
			Logger.error(`Failed to remove the dVPN node container: ${err.message}`);
		else
			Logger.error(`Failed to remove the dVPN node container: ${String(err)}`);
	}

	return false;
}

/**
 * Convert buffer to stream
 * @param buffer
 */
async function bufferToStream(buffer: Buffer): Promise<Readable>
{
	const readable = new Readable();
	readable.push(buffer);
	readable.push(null); // No more data
	return readable;
}

/**
 * Convert stream to string
 * @param stream 
 * @returns string
 */
async function streamToString(stream: Readable): Promise<string>
{
	const chunks: any[] = [];
	return new Promise((resolve, reject) =>
	{
		stream.on('data', (chunk) => chunks.push(chunk));
		stream.on('error', reject);
		stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
	});
}

/**
 * Get container status
 * @returns string
 */
export async function containerStatus(): Promise<string>
{
	// Check if the container exists
	const exists = await containerExists();
	if(exists)
	{
		const isRunning = await containerRunning();
		if(isRunning)
			return 'running';
		else
			return 'stopped';
	}
	
	return 'unavailable';
}

/**
 * Get container logs
 * @returns string | null
 */
export async function containerLogs(): Promise<string | null>
{
	try
	{
		// Get the container
		const container = docker.getContainer(config.DOCKER_CONTAINER_NAME);
		// Get the logs
		const logBuffer = await container.logs({
			stdout: true,
			stderr: true,
			tail: 100
		});
		
		// Convert buffer to stream
		const logStream = await bufferToStream(logBuffer);
		// Convert stream to string
		const logs = await streamToString(logStream as Readable);
		
		Logger.info(`Docker logs retrieved successfully.`);
		return logs;
	}
	catch (err)
	{
		if (err instanceof Error)
			Logger.error(`Failed to retrieve the dVPN node container logs: ${err.message}`);
		else
			Logger.error(`Failed to retrieve the dVPN node container logs: ${String(err)}`);
		
	}
	
	return null;
}
