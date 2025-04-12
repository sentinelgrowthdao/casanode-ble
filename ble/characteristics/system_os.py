#!/usr/bin/env python3
import dbus
import dbus.service
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class SystemOsCharacteristic(BaseCharacteristic):
    def __init__(self, bus, index, uuid):
        flags = ['read']
        super().__init__(bus, index, uuid, flags)
        self.service_path = '/org/bluez/example/service0'
        self.api_client = APIClient()
        
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="a{sv}", out_signature="ay")
    def ReadValue(self, options):
        response = self.api_client.get("api/v1/status")
        if response is not None:
            try:
                data = response.json()
                os_value = data.get("systemOs", "error").strip()
                logger.info(f"SystemOsCharacteristic: read OS '{os_value}'")
            except Exception as e:
                logger.error(f"Error reading system OS: {e}")
                os_value = "error"
        else:
            os_value = "error"
        return [dbus.Byte(b) for b in os_value.encode("utf-8")]
