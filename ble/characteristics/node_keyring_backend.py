#!/usr/bin/env python3
import dbus
import dbus.service
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class NodeKeyringBackendCharacteristic(BaseCharacteristic):
    def __init__(self, bus, index, uuid):
        flags = ['read', 'write']
        super().__init__(bus, index, uuid, flags)
        self.service_path = '/org/bluez/example/service0'
        self.api_client = APIClient()
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="a{sv}", out_signature="ay")
    def ReadValue(self, options):
        response = self.api_client.get("api/v1/node/configuration")
        if response is not None:
            try:
                data = response.json()
                backend = data.get("backend", "unknown")
                logger.info(f"NodeKeyringBackendCharacteristic: Read backend '{backend}' via REST API")
            except Exception as e:
                logger.error(f"NodeKeyringBackendCharacteristic: Error reading backend via REST API: {e}")
                backend = "error"
        else:
            backend = "error"
        return [dbus.Byte(b) for b in backend.encode("utf-8")]
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="aya{sv}", out_signature="")
    def WriteValue(self, value, options):
        new_backend = bytes(value).decode("utf-8").strip()
        if new_backend not in ["test", "file"]:
            logger.error("NodeKeyringBackendCharacteristic: Invalid node keyring backend value")
            raise dbus.DBusException("org.bluez.Error.InvalidValue")
        payload = {"backend": new_backend}
        response = self.api_client.put("api/v1/node/configuration", json=payload)
        if response is not None and response.status_code == 200:
            logger.info(f"NodeKeyringBackendCharacteristic: Backend updated to '{new_backend}' via REST API")
        else:
            logger.error("NodeKeyringBackendCharacteristic: Error updating backend via REST API")
            raise dbus.DBusException("org.bluez.Error.UnlikelyError")
