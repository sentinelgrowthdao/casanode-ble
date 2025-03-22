#!/usr/bin/env python3
import dbus
import dbus.service
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class MaxPeersCharacteristic(BaseCharacteristic):
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
                max_peers = str(data.get("maximumPeers", "0"))
                logger.info(f"MaxPeersCharacteristic: read value '{max_peers}'")
            except Exception as e:
                logger.error(f"MaxPeersCharacteristic: Error reading maximumPeers: {e}")
                max_peers = "0"
        else:
            max_peers = "0"
        return [dbus.Byte(b) for b in max_peers.encode('utf-8')]
        
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="aya{sv}", out_signature="")
    def WriteValue(self, value, options):
        try:
            new_value = int(bytes(value).decode('utf-8').strip())
            if new_value < 1 or new_value > 99999:
                logger.error("MaxPeersCharacteristic: Invalid maximumPeers value")
                raise dbus.DBusException("org.bluez.Error.InvalidValue")
            payload = {"maximumPeers": new_value}
            response = self.api_client.put("api/v1/node/configuration", json=payload)
            if response is not None:
                logger.info(f"MaxPeersCharacteristic: maximumPeers updated to {new_value}")
            else:
                logger.error("MaxPeersCharacteristic: Failed to update maximumPeers")
                raise dbus.DBusException("org.bluez.Error.UnlikelyError")
        except Exception as e:
            logger.error(f"MaxPeersCharacteristic: Error updating maximumPeers: {e}")
            raise dbus.DBusException("org.bluez.Error.UnlikelyError")
