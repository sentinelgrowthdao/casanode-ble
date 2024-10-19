import * as path from 'path';
import fs from 'fs-extra';
import forge from 'node-forge';
import config from './configuration';
import { Logger } from './logger';

export interface CertificateInfo
{
	creationDate: string;
	expirationDate: string;
	issuer: string;
	subject: string;
}

class CertificateManager
{
	private static instance: CertificateManager;
	
	// Default paths for certificate and key files
	private certFilePath: string = path.join(config.CONFIG_DIR, 'tls.crt');
	private keyFilePath: string = path.join(config.CONFIG_DIR, 'tls.key');
	private nodeCountry: string = 'NA';
	
	private constructor() {}
	
	/**
	 * Get instance of CertificateManager
	 * @returns CertificateManager
	 */
	public static getInstance(): CertificateManager
	{
		if (!CertificateManager.instance)
		{
			CertificateManager.instance = new CertificateManager();
		}
		return CertificateManager.instance;
	}
	
	/**
	 * Generate a new certificate
	 * @param validityYears - Certificate validity in years (default is 1)
	 * @param certPath - Optional path for the certificate file
	 * @param keyPath - Optional path for the key file
	 * @returns boolean - True if the generation succeeds, false otherwise
	 */
	public async generate(validityYears: number = 1, certPath?: string, keyPath?: string): Promise<boolean>
	{
		try
		{
			// Use custom paths if provided, otherwise default paths
			const certFilePath = certPath || this.certFilePath;
			const keyFilePath = keyPath || this.keyFilePath;
			
			// If certificate and key files exist, remove them
			if (await fs.pathExists(certFilePath) && await fs.pathExists(keyFilePath))
			{
				await this.remove(certFilePath, keyFilePath);
			}
			
			// Create directory if it does not exist
			await fs.ensureDir(path.dirname(keyFilePath));
			await fs.ensureDir(path.dirname(certFilePath));
			
			// Generate key pair and create the certificate and private key
			const keys = forge.pki.rsa.generateKeyPair(2048);
			const cert = forge.pki.createCertificate();
			cert.publicKey = keys.publicKey;
			cert.serialNumber = '01';
			cert.validity.notBefore = new Date();
			cert.validity.notAfter = new Date();
			cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + validityYears);
			
			// Define certificate attributes
			const attrs =
			[
				{ name: 'countryName', value: this.nodeCountry },
				{ name: 'organizationName', value: 'NA' },
				{ shortName: 'ST', value: 'NA' },
				{ shortName: 'CN', value: '.' },
			];
			
			// Set certificate subject and issuer
			cert.setSubject(attrs);
			cert.setIssuer(attrs);
			cert.sign(keys.privateKey, forge.md.sha256.create());
			
			// Convert certificate and private key to PEM format
			const pemCert = forge.pki.certificateToPem(cert);
			const pemKey = forge.pki.privateKeyToPem(keys.privateKey);
			
			// Write the certificate and key files
			await fs.writeFile(certFilePath, pemCert);
			await fs.writeFile(keyFilePath, pemKey);
			
			// Change ownership of certificate files to root
			// await fs.chown(this.certFilePath, 0, 0);
			// await fs.chown(this.keyFilePath, 0, 0);
			
			Logger.info("Certificate files have been generated.");
			return true;
		}
		catch (error)
		{
			if (error instanceof Error)
				Logger.error(`Failed to generate certificate: ${error.message}`);
			else
				Logger.error(`Failed to generate certificate: ${String(error)}`);
		}
		
		return false;
	}
	
	/**
	 * Get certificate information
	 * @param certPath - Optional path for the certificate file
	 * @returns CertificateInfo | null
	 */
	public info(certPath?: string): CertificateInfo | null
	{
		try
		{
			const certFilePath = certPath || this.certFilePath;
			
			// Check if the certificate file do not exists
			if (!fs.pathExistsSync(certFilePath))
			{
				Logger.info("Certificate or key file not found.");
				return null;
			}
			
			// Read the certificate file
			const pemCert = fs.readFileSync(certFilePath, 'utf-8');
			const cert = forge.pki.certificateFromPem(pemCert);
			
			// Return certificate information
			return {
				creationDate: cert.validity.notBefore.toISOString(),
				expirationDate: cert.validity.notAfter.toISOString(),
				issuer: cert.issuer.attributes.map((attr: forge.pki.CertificateField) => `${attr.name}=${attr.value}`).join(', '),
				subject: cert.subject.attributes.map((attr: forge.pki.CertificateField) => `${attr.name}=${attr.value}`).join(', '),
			} as CertificateInfo;
		}
		catch (error)
		{
			if (error instanceof Error)
				Logger.error(`Failed to read certificate: ${error.message}`);
			else
				Logger.error(`Failed to read certificate: ${String(error)}`);
		}
		
		return null;
	}
	
	/**
	 * Remove certificate and key files
	 * @param certPath - Optional path for the certificate file
	 * @param keyPath - Optional path for the key file
	 * @returns boolean - True if files were successfully removed, false otherwise
	 */
	public async remove(certPath?: string, keyPath?: string): Promise<boolean>
	{
		try
		{
			const certFilePath = certPath || this.certFilePath;
			const keyFilePath = keyPath || this.keyFilePath;
			
			// If certificate files do not exist, return true
			if (!await fs.pathExists(certFilePath) && !await fs.pathExists(keyFilePath))
				return true;
			
			// Remove the certificate and key files
			await fs.remove(certFilePath);
			await fs.remove(keyFilePath);
			
			Logger.info("Certificate files have been removed.");
			return true;
		}
		catch (error)
		{
			if (error instanceof Error)
				Logger.error(`Failed to remove certificate files: ${error.message}`);
			else
				Logger.error(`Failed to remove certificate files: ${String(error)}`);
		}
		
		return false;
	}
}

// Create a singleton instance of certificateManager
const certificateManager = CertificateManager.getInstance();
export default certificateManager;

export const certificateGenerate = (validityYears = 1, certPath?: string, keyPath?: string): Promise<boolean> => certificateManager.generate(validityYears, certPath, keyPath);
export const certificateInfo = (certPath?: string): CertificateInfo | null => certificateManager.info(certPath);
export const certificateRemove = (certPath?: string, keyPath?: string): Promise<boolean> => certificateManager.remove(certPath, keyPath);
