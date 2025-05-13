#!/usr/bin/env python3
import threading
from utils.config import get_config
from utils import logger
from gatt_server import main as run_gatt_server

def daemon_command():
	logger.info("Daemon process started.")
	try:
		# Load configuration
		config = get_config()
		logger.info(f"Configuration loaded: {config}")
		
		# Validate BLE configuration
		ble_enabled_raw = config.get('BLE_ENABLED', '')
		ble_enabled = str(ble_enabled_raw).lower() == 'true'
		ble_uuid = config.get('BLE_UUID')
		ble_discovery = config.get('BLE_DISCOVERY_UUID')
		ble_seed = config.get('BLE_CHARACTERISTIC_SEED')
		
		errors = []
		
		# Check if BLE is enabled
		if not ble_enabled:
			errors.append(f"BLE_ENABLED is disabled or not 'true' (value: '{ble_enabled_raw}')")
		# Check if UUIDs are valid
		if not ble_uuid or not isinstance(ble_uuid, str) or len(ble_uuid.strip()) == 0:
			errors.append(f"BLE_UUID is missing or empty (value: '{ble_uuid}')")
		# Check if discovery UUID and seed are valid
		if not ble_discovery or not isinstance(ble_discovery, str) or len(ble_discovery.strip()) == 0:
			errors.append(f"BLE_DISCOVERY_UUID is missing or empty (value: '{ble_discovery}')")
		# Check if characteristic seed is valid
		if not ble_seed or not isinstance(ble_seed, str) or len(ble_seed.strip()) == 0:
			errors.append(f"BLE_CHARACTERISTIC_SEED is missing or empty (value: '{ble_seed}')")
		
		# If there are any errors, log them and skip starting the GATT server
		if errors:
			logger.warning("BLE configuration invalid. Skipping GATT server startup for the following reasons:")
			for err in errors:
				logger.warning(f"  - {err}")
			return
		
		# Start the BLE GATT server (this call is blocking)
		run_gatt_server()
		
	except Exception as e:
		logger.error(f"Unexpected error in daemon: {e}")

if __name__ == '__main__':
	daemon_command()
