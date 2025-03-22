#!/usr/bin/env python3
import os
import pathlib
import dotenv
import uuid

CONFIG_FILE = '/etc/casanode.conf'

# Load configuration from file if it exists; otherwise, use default values.
if pathlib.Path(CONFIG_FILE).exists():
    dotenv.load_dotenv(CONFIG_FILE)
else:
    print(f"Configuration file {CONFIG_FILE} not found. Using default values.")

config = {
    'BLENO_DEVICE_NAME': os.getenv('BLENO_DEVICE_NAME', 'Casanode'),
    'DOCKER_IMAGE_NAME': os.getenv('DOCKER_IMAGE_NAME', 'wajatmaka/sentinel-aarch64-alpine:v0.7.1'),
    'DOCKER_CONTAINER_NAME': os.getenv('DOCKER_CONTAINER_NAME', 'sentinel-dvpn-node'),
    'CONFIG_DIR': os.getenv('CONFIG_DIR', os.path.join(os.environ.get('HOME', '/opt/casanode'), '.sentinelnode')),
    'LOG_DIR': os.getenv('LOG_DIR', '/var/log/casanode'),
    'CERTS_DIR': os.getenv('CERTS_DIR', '/opt/casanode/app/certs'),
    'DOCKER_SOCKET': os.getenv('DOCKER_SOCKET', f"/run/user/{os.getuid()}/docker.sock"),
    'BLE_ENABLED': os.getenv('BLE_ENABLED', 'true'),
    'BLE_UUID': os.getenv('BLE_UUID', '00001820-0000-1000-8000-00805f9b34fb'),
    'BLE_DISCOVERY_UUID': os.getenv('BLE_DISCOVERY_UUID', '0000a2d4-0000-1000-8000-00805f9b34fb'),
    'BLE_CHARACTERISTIC_SEED': os.getenv('BLE_CHARACTERISTIC_SEED', str(uuid.uuid4())),
    'WEB_LISTEN': os.getenv('WEB_LISTEN', '0.0.0.0:8080'),
    'API_LISTEN': os.getenv('API_LISTEN', '0.0.0.0:8081'),
    'API_AUTH': os.getenv('API_AUTH', str(uuid.uuid4())),
}

def get_config():
    return config
