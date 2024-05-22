// import bleno from '@abandonware/bleno'; <- This import stuck the process
// The direct ES6 import of the Bleno module causes the Node.js process to hang indefinitely,
// even when Bleno is not explicitly used. This is likely due to internal asynchronous operations
// or timers initialized by Bleno upon import, which keep the event loop active.

// To avoid this issue, we use the CommonJS require syntax to import Bleno dynamically
// within the function. The createRequire function from the 'module' package allows us
// to use require in an ES6 module context.

import { createRequire } from 'module';	// <- Used to import the Bleno module in the same way as require
import { Logger } from '@utils/logger';
import config from '@utils/configuration';

import { HelloCharacteristic } from '@characteristics/hello';

export const daemonCommand = () =>
{
	console.log('Daemon process started');
	
	const require = createRequire(import.meta.url);
	const bleno = require('bleno');
	
	const serviceUuid = '0000180d-0000-1000-8000-00805f9b34fb';
	const helloCharacteristicUuid = '0000180d-0000-1000-8000-00805f9b34fc';
	
	const service = new bleno.PrimaryService({
		uuid: serviceUuid,
		characteristics: [
			HelloCharacteristic.createHelloCharacteristic(helloCharacteristicUuid)
		]
	});
	
	bleno.on('stateChange', (state: any) =>
	{
		console.log('stateChange');
		
		if (state === 'poweredOn')
		{
			Logger.info('Application started successfully.');
			bleno.startAdvertising('Casanode', [serviceUuid]);
		}
		else
		{
			Logger.info('Application stopped.');
			bleno.stopAdvertising();
		}
	});
	
	bleno.on('advertisingStart', (error: any) => 
	{
		console.log('advertisingStart');
		if (!error) 
		{
			console.log('Advertising...');
			bleno.setServices([service]);
		}
	});
};
