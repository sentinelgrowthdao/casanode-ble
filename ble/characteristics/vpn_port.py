#!/usr/bin/env python3
import dbus
import dbus.service
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class VpnPortCharacteristic(BaseCharacteristic):
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
                vpn_port = str(data.get("vpnPort", "0"))
                logger.info(f"VpnPortCharacteristic: Read vpnPort '{vpn_port}' from REST API")
            except Exception as e:
                logger.error(f"VpnPortCharacteristic: Error reading vpnPort via REST API: {e}")
                vpn_port = "error"
        else:
            vpn_port = "error"
        return [dbus.Byte(b) for b in vpn_port.encode("utf-8")]

    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="aya{sv}", out_signature="")
    def WriteValue(self, value, options):
        try:
            new_port = int(bytes(value).decode("utf-8").strip())
            if new_port < 1 or new_port > 65535:
                logger.error("VpnPortCharacteristic: Invalid vpnPort value")
                raise dbus.DBusException("org.bluez.Error.InvalidValue")
            payload = {"vpnPort": new_port}
            response = self.api_client.put("api/v1/node/configuration", json=payload)
            if response is not None and response.status_code == 200:
                logger.info(f"VpnPortCharacteristic: vpnPort updated to {new_port} via REST API")
            else:
                logger.error(f"VpnPortCharacteristic: Failed to update vpnPort, status code {response.status_code if response else 'None'}")
                raise dbus.DBusException("org.bluez.Error.UnlikelyError")
        except Exception as e:
            logger.error(f"VpnPortCharacteristic: Error updating vpnPort via REST API: {e}")
            raise dbus.DBusException("org.bluez.Error.UnlikelyError")
