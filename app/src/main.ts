import { Command } from 'commander';
import { daemonCommand, checkInstallationCommand } from '@commands/index';

// Create a new program and set program information
const program = new Command();
program.name('casanode-ble')
	.description('CLI for managing Bluetooth communication with the mobile application and handling Casanode node operations')
	.version('1.0.0');

// Display help information
program.command('help')
	.description('Display help information')
	.action(() => program.help());

// Run daemon process
program.command('daemon')
	.description('Run the daemon process')
	.action(() => { daemonCommand(); });

// Check installation
program.command('check-installation')
	.description('Check the installation of the casanode and its dependencies')
	.action((argv) => checkInstallationCommand(argv));

// If no command is provided, run the daemon process
program.action(() => { daemonCommand(); });

// Parse command line arguments
program.parse(process.argv);
