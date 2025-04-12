#!/usr/bin/env python3
import dbus
import dbus.service
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class CheckInstallationCharacteristic(BaseCharacteristic):
    def __init__(self, bus, index, uuid):
        flags = ['read']
        super().__init__(bus, index, uuid, flags)
        self.service_path = '/org/bluez/example/service0'
        self.api_client = APIClient()
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="a{sv}", out_signature="ay")
    def ReadValue(self, options):
        response = self.api_client.get("api/v1/check/installation")
        if response is not None:
            json_data = response.json()
            data = [
                '1' if json_data.get('image', False) else '0',
                '1' if json_data.get('containerExists', False) else '0',
                '1' if json_data.get('nodeConfig', False) else '0',
                '1' if json_data.get('vpnConfig', False) else '0',
                '1' if json_data.get('certificateKey', False) else '0',
                '1' if json_data.get('wallet', False) else '0',
            ]
            result = ''.join(data)
            logger.info(f"CheckInstallationCharacteristic: received '{result}'")
        else:
            result = "error"
            logger.error("CheckInstallationCharacteristic: error retrieving installation check")
        return [dbus.Byte(b) for b in result.encode('utf-8')]
