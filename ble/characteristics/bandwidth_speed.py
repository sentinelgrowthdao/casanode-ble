#!/usr/bin/env python3
import dbus
import dbus.service
import json
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class BandwidthSpeedCharacteristic(BaseCharacteristic):
    def __init__(self, bus, index, uuid):
        flags = ['read']
        super().__init__(bus, index, uuid, flags)
        self.service_path = '/org/bluez/example/service0'
        self.api_client = APIClient()

    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="a{sv}", out_signature="ay")
    def ReadValue(self, options):
        response = self.api_client.get("api/v1/status")
        if response is not None:
            try:
                data = response.json()
                bandwidth = data.get("bandwidth", {})
                info = {"d": bandwidth.get("download", -1), "u": bandwidth.get("upload", -1)}
                result = json.dumps(info)
                logger.info(f"BandwidthSpeedCharacteristic: read {result}")
            except Exception as e:
                logger.error(f"Error reading bandwidth speed: {e}")
                result = json.dumps({"d": -1, "u": -1})
        else:
            result = json.dumps({"d": -1, "u": -1})
        return [dbus.Byte(b) for b in result.encode("utf-8")]
