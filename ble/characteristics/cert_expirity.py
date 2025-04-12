#!/usr/bin/env python3
import dbus
import dbus.service
import json
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class CertExpirityCharacteristic(BaseCharacteristic):
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
                data = json.loads(response.text)
                expiration = data.get("certificate", {}).get("expirationDate", "error")
                logger.info(f"CertExpirityCharacteristic: received expiration '{expiration}'")
            except Exception as e:
                logger.error(f"CertExpirityCharacteristic error: {e}")
                expiration = "error"
        else:
            expiration = "error"
        return [dbus.Byte(b) for b in expiration.encode("utf-8")]
