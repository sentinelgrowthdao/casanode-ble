#!/usr/bin/env python3
import dbus
import dbus.service
import json
from characteristics.base import BaseCharacteristic
from utils import logger, config, validators
from utils.api import APIClient

class NodeIpCharacteristic(BaseCharacteristic):
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
                data = response.json()  # Expect "node_ip" in the response
                node_ip = data.get("node_ip", "")
                logger.info(f"NodeIpCharacteristic: read node_ip '{node_ip}'")
            except Exception as e:
                logger.error(f"Error reading node_ip: {e}")
                node_ip = "error"
        else:
            node_ip = "error"
        return [dbus.Byte(b) for b in node_ip.encode("utf-8")]
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="aya{sv}", out_signature="")
    def WriteValue(self, value, options):
        new_ip = bytes(value).decode("utf-8").strip()
        if not validators.is_valid_ip(new_ip) and not validators.is_valid_dns(new_ip):
            logger.error("Invalid node_ip value")
            raise dbus.DBusException("org.bluez.Error.InvalidValue")
        payload = {"node_ip": new_ip}
        response = self.api_client.put("api/v1/node/configuration", json=payload)
        if response is not None and response.status_code == 200:
            logger.info(f"NodeIpCharacteristic: node_ip updated to {new_ip}")
        else:
            logger.error("Failed to update node_ip")
            raise dbus.DBusException("org.bluez.Error.UnlikelyError")
