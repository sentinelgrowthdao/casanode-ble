#!/usr/bin/env python3
import dbus
import dbus.service
from characteristics.base import BaseCharacteristic
from utils import logger, config, network

class DiscoveryCharacteristic(BaseCharacteristic):
    def __init__(self, bus, index, uuid):
        # Set the "read" flag because this characteristic is read-only
        flags = ['read']
        super().__init__(bus, index, uuid, flags)
        # Set the parent service path
        self.service_path = '/org/bluez/example/service0'
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="a{sv}", out_signature="ay")
    def ReadValue(self, options):
        # Retrieve the local IP address using a utility function
        local_ip = network.get_local_ip_address()  # Example: "192.168.1.100"
        web_listen = config.get_config().get("WEB_LISTEN", "0.0.0.0:8080")
        port = web_listen.split(":")[1] if ":" in web_listen else "8080"
        value = f"{local_ip}:{port}"
        logger.info(f"DiscoveryCharacteristic: Sending '{value}'")
        return [dbus.Byte(b) for b in value.encode('utf-8')]
