#!/usr/bin/env python3
import dbus
import dbus.service
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class NodeStatusCharacteristic(BaseCharacteristic):
    def __init__(self, bus, index, uuid):
        flags = ['read']
        super().__init__(bus, index, uuid, flags)
        self.service_path = '/org/bluez/example/service0'
        self.api_client = APIClient()
    
    def get_api_status(self):
        response = self.api_client.get("node/status")
        if response is not None:
            try:
                data = response.json()
                return data.get("status", "error")
            except ValueError:
                return "error"
        return "error"
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="a{sv}", out_signature="ay")
    def ReadValue(self, options):
        status = self.get_api_status()
        return [dbus.Byte(b) for b in status.encode('utf-8')]
