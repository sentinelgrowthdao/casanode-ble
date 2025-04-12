#!/usr/bin/env python3
import dbus
import dbus.service
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class OnlineUsersCharacteristic(BaseCharacteristic):
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
                # Extract the number of online users from the "peers" attribute
                peers = data.get("status", {}).get("peers", -1)
                logger.info(f"OnlineUsersCharacteristic: received '{peers}'")
            except Exception as e:
                logger.error(f"Error reading status: {e}")
                peers = 0
        else:
            peers = 0
        peers_str = str(peers)
        return [dbus.Byte(b) for b in peers_str.encode("utf-8")]
