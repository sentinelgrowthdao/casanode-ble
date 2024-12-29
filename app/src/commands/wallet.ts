import {
	nodeConfig,
	walletCreate,
	walletRecover,
	walletRemove,
	walletBalance,
	walletLoadAddresses
} from '@utils/node';

export const walletCommand = async (options: any) =>
{
	let passphrase = null;
	
	// Get the node configuration
	const config = nodeConfig();
	
	// Check if the wallet passphrase is required
	if (config.backend === 'file' && options.passphrase)
		passphrase = options.passphrase ?? null;
	
	// Check the wallet command
	if (options.create)
	{
		console.log('Creating a new wallet...');
		
		const result = await walletCreate(passphrase);
		if (result)
			console.log('Wallet created successfully');
		else
			console.log('Failed to create a new wallet');
	}
	else if (options.recover)
	{
		console.log('Recovering the wallet...');
		
		// If mnemonic is provided, recover the wallet using the mnemonic
		if (options.mnemonic)
		{
			const result = await walletRecover(options.mnemonic, passphrase);
			if (result)
				console.log('Wallet recovered successfully');
			else
				console.log('Failed to recover the wallet');
		}
		else
		{
			console.log('No mnemonic provided (--mnemonic)');
		}
	}
	else if (options.remove)
	{
		console.log('Removing the wallet...');
		
		const result = await walletRemove(passphrase);
		if (result)
			console.log('Wallet removed successfully');
		else
			console.log('Failed to remove the wallet');
	}
	else if (options.balance)
	{
		console.log('Checking the wallet balance...');
		
		// Load the wallet addresses and check the balance
		if (await walletLoadAddresses(passphrase))
		{
			// Check the wallet balance
			const result = await walletBalance(nodeConfig().walletPublicAddress);
			if (result)
				console.log(`Wallet balance: ${result.amount} ${result.denom}`);
			else
				console.log('Failed to check the wallet balance');
		}
		else
		{
			console.log('Failed to load the wallet addresses');
		}
	}
	else if (options.addresses)
	{
		console.log('Loading the wallet addresses...');
		
		const result = await walletLoadAddresses(passphrase);
		if (result)
		{
			console.log(`Wallet public address: ${nodeConfig().walletPublicAddress}`);
			console.log(`Wallet node address: ${nodeConfig().walletNodeAddress}`);
		}
		else
			console.log('Failed to load the wallet addresses');
	}
	else
	{
		console.log('No Wallet command provided');
	}
};