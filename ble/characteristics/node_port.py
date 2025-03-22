#!/usr/bin/env python3
import dbus
import dbus.service
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class NodePortCharacteristic(BaseCharacteristic):
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
                node_port = str(data.get("nodePort", "0"))
                logger.info(f"NodePortCharacteristic: read node_port '{node_port}'")
            except Exception as e:
                logger.error(f"Error reading node port: {e}")
                node_port = "error"
        else:
            node_port = "error"
        return [dbus.Byte(b) for b in node_port.encode("utf-8")]
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="aya{sv}", out_signature="")
    def WriteValue(self, value, options):
        try:
            new_port = int(bytes(value).decode("utf-8").strip())
            if new_port < 1 or new_port > 65535:
                logger.error("Invalid node_port value")
                raise dbus.DBusException("org.bluez.Error.InvalidValue")
            payload = {"nodePort": new_port}
            response = self.api_client.put("api/v1/node/configuration", json=payload)
            if response is not None and response.status_code == 200:
                logger.info(f"NodePortCharacteristic: updated node_port to {new_port}")
            else:
                logger.error("Failed to update node_port")
                raise dbus.DBusException("org.bluez.Error.UnlikelyError")
        except Exception as e:
            logger.error(f"Error updating node port: {e}")
            raise dbus.DBusException("org.bluez.Error.UnlikelyError")
