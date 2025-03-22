#!/usr/bin/env python3
import dbus
import dbus.service
import json
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class VpnTypeCharacteristic(BaseCharacteristic):
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
                vpn_type = data.get("vpnType", "")
                logger.info(f"VpnTypeCharacteristic: Read vpn_type '{vpn_type}' via REST API")
            except Exception as e:
                logger.error(f"VpnTypeCharacteristic: Error reading vpn_type via REST API: {e}")
                vpn_type = "error"
        else:
            vpn_type = "error"
        return [dbus.Byte(b) for b in vpn_type.encode("utf-8")]
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="aya{sv}", out_signature="")
    def WriteValue(self, value, options):
        new_type = bytes(value).decode("utf-8").strip().lower()
        if new_type not in ["wireguard", "v2ray"]:
            logger.error("VpnTypeCharacteristic: Invalid vpn_type value")
            raise dbus.DBusException("org.bluez.Error.InvalidValue")
        payload = {"vpnType": new_type}
        response = self.api_client.put("api/v1/node/configuration", json=payload)
        if response is not None and response.status_code == 200:
            logger.info(f"VpnTypeCharacteristic: vpn_type updated to {new_type} via REST API")
        else:
            logger.error(f"VpnTypeCharacteristic: Failed to update vpn_type, status code {response.status_code if response else 'None'}")
            raise dbus.DBusException("org.bluez.Error.UnlikelyError")
