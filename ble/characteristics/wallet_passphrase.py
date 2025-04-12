#!/usr/bin/env python3
import dbus
import dbus.service
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class WalletPassphraseCharacteristic(BaseCharacteristic):
    def __init__(self, bus, index, uuid):
        flags = ['read', 'write']
        super().__init__(bus, index, uuid, flags)
        self.service_path = '/org/bluez/example/service0'
        self.api_client = APIClient()
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="a{sv}", out_signature="ay")
    def ReadValue(self, options):
        response = self.api_client.get("api/v1/node/passphrase")
        if response is not None:
            try:
                data = response.json()
                required = '1' if data.get("required") else '0'
                available = '1' if data.get("available") else '0'
                result = f"{required}{available}"
                logger.info(f"NodePassphraseCharacteristic: received passphrase state '{result}'")
            except Exception as e:
                logger.error(f"Error reading node passphrase: {e}")
                result = "error"
        else:
            result = "error"
        return [dbus.Byte(b) for b in result.encode("utf-8")]
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="aya{sv}", out_signature="")
    def WriteValue(self, value, options):
        passphrase = bytes(value).decode("utf-8").strip()
        if not passphrase:
            logger.error("Empty passphrase")
            raise dbus.DBusException("org.bluez.Error.InvalidValue")
        payload = {"passphrase": passphrase}
        response = self.api_client.post("api/v1/node/passphrase", json=payload)
        if response is not None and response.status_code == 200:
            logger.info("Passphrase set successfully")
        else:
            logger.error("Failed to set passphrase")
            raise dbus.DBusException("org.bluez.Error.UnlikelyError")
