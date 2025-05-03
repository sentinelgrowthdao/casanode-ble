#!/usr/bin/env python3
import dbus
import dbus.service
import threading
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class CertificateActionsCharacteristic(BaseCharacteristic):
    def __init__(self, bus, index, uuid):
        flags = ['read', 'write', 'notify']
        super().__init__(bus, index, uuid, flags)
        self.service_path = '/org/bluez/example/service0'
        self.cert_status = "0"
        self.api_client = APIClient()
        self.lock = threading.Lock()
        self.notifying = False
    
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
        with self.lock:
            self.cert_status = "1"
        self._notify_clients()
        threading.Thread(target=self._renew_certificate, daemon=True).start()
    
    def _renew_certificate(self):
        try:
            response = self.api_client.post("api/v1/certificate/renew")
            with self.lock:
                if response and response.status_code == 200:
                    self.cert_status = "2"
                    logger.info("Certificate renewed successfully")
                else:
                    self.cert_status = "-1"
                    logger.error("Certificate renewal failed")
        except Exception as e:
            with self.lock:
                self.cert_status = "-1"
            logger.error(f"Certificate renewal exception: {e}")
        finally:
            self._notify_clients()

    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="", out_signature="")
    def StartNotify(self):
        logger.info("CertificateActionsCharacteristic: StartNotify")
        self.notifying = True
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="", out_signature="")
    def StopNotify(self):
        logger.info("CertificateActionsCharacteristic: StopNotify")
        self.notifying = False
    
    def _notify_clients(self):
        """Sends a PropertiesChanged signal if a client is subscribed."""
        if not self.notifying:
            return
        with self.lock:
            arr = [dbus.Byte(b) for b in self.cert_status.encode('utf-8')]
        self.PropertiesChanged(
            "org.bluez.GattCharacteristic1",
            {"Value": dbus.Array(arr, signature='y')},
            []
        )