#!/usr/bin/env python3
import dbus
import dbus.service
import threading
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

# Status: "0" = not started, "1" = in progress, "2" = open, "3" = closed, "-1" = error.
class CheckPortCharacteristic(BaseCharacteristic):
    def __init__(self, bus, index, uuid):
        flags = ['read', 'write']
        super().__init__(bus, index, uuid, flags)
        self.service_path = '/org/bluez/example/service0'
        self.port_status = "0"
        self.api_client = APIClient()
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="a{sv}", out_signature="ay")
    def ReadValue(self, options):
        logger.info(f"CheckPortCharacteristic: current status '{self.port_status}'")
        return [dbus.Byte(b) for b in self.port_status.encode('utf-8')]
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="aya{sv}", out_signature="")
    def WriteValue(self, value, options):
        port_type = bytes(value).decode('utf-8').strip().lower()
        if port_type not in ["node", "vpn"]:
            logger.error("CheckPortCharacteristic: invalid port type")
            raise dbus.DBusException("org.bluez.Error.InvalidValue")
        self.port_status = "1"  # in progress
        threading.Thread(target=self._check_port, args=(port_type,)).start()
    
    def _check_port(self, port_type):
        response = self.api_client.get(f"api/v1/check/port/{port_type}")
        if response is not None:
            try:
                result = response.text.strip().lower()
                self.port_status = "2" if result == "open" else "3"
                logger.info(f"CheckPortCharacteristic: port '{port_type}' status '{self.port_status}'")
            except Exception as e:
                logger.error(f"Error in CheckPortCharacteristic: {e}")
                self.port_status = "-1"
        else:
            self.port_status = "-1"
