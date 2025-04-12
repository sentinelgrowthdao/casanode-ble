#!/usr/bin/env python3
import dbus
import dbus.service
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class CasanodeVersionCharacteristic(BaseCharacteristic):
    def __init__(self, bus, index, uuid):
        flags = ['read']
        super().__init__(bus, index, uuid, flags)
        self.service_path = '/org/bluez/example/service0'
        self.api_client = APIClient()

    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="a{sv}", out_signature="ay")
    def ReadValue(self, options):
        response = self.api_client.get("api/v1/node/configuration")
        if response is not None:
            try:
                data = response.json()
                version = data.get("casanodeVersion", "unknown")
                logger.info(f"CasanodeVersionCharacteristic: read version '{version}'")
            except Exception as e:
                logger.error(f"Error reading casanode version: {e}")
                version = "error"
        else:
            version = "error"
        return [dbus.Byte(b) for b in version.encode("utf-8")]
