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
	
	private certFilePath : string = path.join(config.CONFIG_DIR, 'tls.crt');
	private keyFilePath : string = path.join(config.CONFIG_DIR, 'tls.key');
	private nodeCountry : string = 'NA';
	
	private constructor()
	{
	}
	
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
	 * Generate certificate
	 * @returns boolean
	 */
	public async generate(): Promise<boolean>
	{
		try
		{
			// If certificate files exist, return true
			if (await fs.pathExists(this.certFilePath) && await fs.pathExists(this.keyFilePath))
				return true;
			
			// Generate certificate and private key
			const keys = forge.pki.rsa.generateKeyPair(2048);
			const cert = forge.pki.createCertificate();
			cert.publicKey = keys.publicKey;
			cert.serialNumber = '01';
			cert.validity.notBefore = new Date();
			cert.validity.notAfter = new Date();
			cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
			
			// Set certificate attributes
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
			
			// Write certificate files
			await fs.writeFile(this.certFilePath, pemCert);
			await fs.writeFile(this.keyFilePath, pemKey);
			
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
	 * @returns CertificateInfo | null
	 */
	public info(): CertificateInfo | null
	{
		try
		{
			// If certificate files do not exist
			if (!fs.pathExistsSync(this.certFilePath) || !fs.pathExistsSync(this.keyFilePath))
			{
				Logger.info("Certificate or key file not found.");
				return null;
			}
			
			// Read certificate file
			const pemCert = fs.readFileSync(this.certFilePath, 'utf-8');
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
	 * Remove certificate files
	 * @returns boolean
	 */
	public async remove(): Promise<boolean>
	{
		try
		{
			// If certificate files do not exist, return true
			if (!await fs.pathExists(this.certFilePath) && !await fs.pathExists(this.keyFilePath))
				return true;
			
			// Remove certificate files
			await fs.remove(this.certFilePath);
			await fs.remove(this.keyFilePath);
			
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
