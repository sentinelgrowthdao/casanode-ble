#!/usr/bin/env python3
import dbus
import dbus.service
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class MonikerCharacteristic(BaseCharacteristic):
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
                moniker = data.get("moniker", "DefaultMoniker")
                logger.info(f"MonikerCharacteristic: Read moniker: {moniker}")
            except Exception as e:
                logger.error(f"MonikerCharacteristic: Error reading moniker: {e}")
                moniker = "error"
        else:
            moniker = "error"
        return [dbus.Byte(b) for b in moniker.encode("utf-8")]
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="aya{sv}", out_signature="")
    def WriteValue(self, value, options):
        new_moniker = bytes(value).decode("utf-8").strip()
        if len(new_moniker) <= 8:
            logger.error("MonikerCharacteristic: Moniker too short")
            raise dbus.DBusException("org.bluez.Error.InvalidValueLength")
        logger.info(f"MonikerCharacteristic: Updating moniker to: {new_moniker}")
        payload = {"moniker": new_moniker}
        response = self.api_client.put("api/v1/node/configuration", json=payload)
        if response is not None and response.status_code == 200:
            logger.info("MonikerCharacteristic: Moniker updated successfully via REST API")
        else:
            logger.error("MonikerCharacteristic: Failed to update moniker")
            raise dbus.DBusException("org.bluez.Error.UnlikelyError")
