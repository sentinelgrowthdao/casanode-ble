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
        flags = ['read', 'write', 'notify']
        super().__init__(bus, index, uuid, flags)
        self.service_path = '/org/bluez/example/service0'
        self.port_status = "0"
        self.api_client = APIClient()
        self.lock = threading.Lock()
        self.notifying = False
    
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
        with self.lock:
            self.port_status = "1"
        self._notify_clients()
        threading.Thread(target=self._check_port, args=(port_type,), daemon=True).start()
    
    def _check_port(self, port_type):
        response = self.api_client.get(f"api/v1/check/port/{port_type}")
        if response is not None:
            try:
                result = response.text.strip().lower()
                with self.lock:
                    self.port_status = "2" if result == "open" else "3"
                self._notify_clients()
                logger.info(f"CheckPortCharacteristic: port '{port_type}' status '{self.port_status}'")
            except Exception as e:
                logger.error(f"Error in CheckPortCharacteristic: {e}")
                with self.lock:
                    self.port_status = "-1"
                self._notify_clients()
        else:
            with self.lock:
                self.port_status = "-1"
            self._notify_clients()

    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="", out_signature="")
    def StartNotify(self):
        logger.info("CheckPortCharacteristic: StartNotify")
        self.notifying = True
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="", out_signature="")
    def StopNotify(self):
        logger.info("CheckPortCharacteristic: StopNotify")
        self.notifying = False
    
    def _notify_clients(self):
        """Emits a PropertiesChanged signal if a client is subscribed."""
        if not self.notifying:
            return
        with self.lock:
            arr = [dbus.Byte(b) for b in self.port_status.encode('utf-8')]
        self.PropertiesChanged(
            "org.bluez.GattCharacteristic1",
            {"Value": dbus.Array(arr, signature='y')},
            []
        )