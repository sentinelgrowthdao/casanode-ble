declare module 'node-ufw'
{
	interface ParsedStatus
	{
		to: string;
		action: string;
		from: string;
	}
	
	type LoggingType = 'off' | 'on' | 'low' | 'medium' | 'high' | 'full';
	type PortProtocol = 'udp' | 'tcp';
	
	export const nodeUfw:
	{
		name: string;
		version: string;
		disable: () => Promise<boolean>;
		enable: () => Promise<boolean>;
		reset: () => Promise<boolean>;
		reload: () => Promise<boolean>;
		status: (raw?: boolean) => Promise<string | ParsedStatus[] | null>;
		logging: (type: LoggingType) => Promise<boolean>;
		allow: {
			(port: number | string): Promise<boolean>;
			port: (port: number, protocol?: PortProtocol) => Promise<boolean>;
			address: (address: string, port?: number, protocol?: PortProtocol) => Promise<boolean>;
		};
		deny: {
			(port: number | string): Promise<boolean>;
			port: (port: number, protocol?: PortProtocol) => Promise<boolean>;
			address: (address: string, port?: number, protocol?: PortProtocol) => Promise<boolean>;
		};
		deleteAllow: {
			(port: number | string): Promise<boolean>;
		};
		deleteDeny: {
			(port: number | string): Promise<boolean>;
		};
	};
	
	export default nodeUfw;
	export type { ParsedStatus, LoggingType, PortProtocol };
}
