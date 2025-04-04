#!/usr/bin/env python3
import dbus
import dbus.service
import threading
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class CertificateActionsCharacteristic(BaseCharacteristic):
    def __init__(self, bus, index, uuid):
        flags = ['read', 'write']
        super().__init__(bus, index, uuid, flags)
        self.service_path = '/org/bluez/example/service0'
        self.cert_status = "0"
        self.api_client = APIClient()
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="a{sv}", out_signature="ay")
    def ReadValue(self, options):
        logger.info(f"CertificateActionsCharacteristic: status '{self.cert_status}'")
        return [dbus.Byte(b) for b in self.cert_status.encode("utf-8")]
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="aya{sv}", out_signature="")
    def WriteValue(self, value, options):
        action = bytes(value).decode("utf-8").strip().lower()
        if action != "renew":
            logger.error(f"CertificateActionsCharacteristic: unknown action '{action}'")
            raise dbus.DBusException("org.bluez.Error.InvalidValue")
        if self.cert_status == "1":
            logger.error("Certificate renewal already in progress")
            raise dbus.DBusException("org.bluez.Error.UnlikelyError")
        self.cert_status = "1"
        threading.Thread(target=self._renew_certificate).start()
    
    def _renew_certificate(self):
        response = self.api_client.post("api/v1/certificate/renew")
        if response is not None:
            if response.status_code == 200:
                self.cert_status = "2"
                logger.info("Certificate renewed successfully")
            else:
                self.cert_status = "-1"
                logger.error("Certificate renewal failed")
        else:
            self.cert_status = "-1"
