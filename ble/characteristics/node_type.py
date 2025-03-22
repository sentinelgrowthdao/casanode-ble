#!/usr/bin/env python3
import dbus
import dbus.service
import json
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class NodeTypeCharacteristic(BaseCharacteristic):
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
                node_type = data.get("nodeType", "")
                logger.info(f"NodeTypeCharacteristic: read node_type '{node_type}'")
            except Exception as e:
                logger.error(f"Error reading node type: {e}")
                node_type = "error"
        else:
            node_type = "error"
        return [dbus.Byte(b) for b in node_type.encode("utf-8")]
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="aya{sv}", out_signature="")
    def WriteValue(self, value, options):
        new_type = bytes(value).decode("utf-8").strip().lower()
        if new_type not in ["residential", "datacenter"]:
            logger.error("Invalid node_type value")
            raise dbus.DBusException("org.bluez.Error.InvalidValue")
        payload = {"nodeType": new_type}
        response = self.api_client.put("api/v1/node/configuration", json=payload)
        if response is not None and response.status_code == 200:
            logger.info(f"NodeTypeCharacteristic: updated node_type to {new_type}")
        else:
            logger.error("Failed to update node_type")
            raise dbus.DBusException("org.bluez.Error.UnlikelyError")
