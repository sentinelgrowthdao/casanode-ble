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
		
		# Start the BLE GATT server (this call is blocking)
		run_gatt_server()
		
	except Exception as e:
		logger.error(f"Unexpected error in daemon: {e}")

if __name__ == '__main__':
	daemon_command()
