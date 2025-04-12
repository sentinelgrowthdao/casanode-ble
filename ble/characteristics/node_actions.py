#!/usr/bin/env python3
import dbus
import dbus.service
import threading
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class NodeActionsCharacteristic(BaseCharacteristic):
    def __init__(self, bus, index, uuid):
        flags = ['write']
        super().__init__(bus, index, uuid, flags)
        self.service_path = '/org/bluez/example/service0'
        self.api_client = APIClient()
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="aya{sv}", out_signature="")
    def WriteValue(self, value, options):
        action = bytes(value).decode("utf-8").strip().lower()
        threading.Thread(target=self._perform_action, args=(action,)).start()
    
    def _perform_action(self, action):
        try:
            if action == "start":
                response = self.api_client.put("api/v1/node/start")
            elif action == "stop":
                response = self.api_client.put("api/v1/node/stop")
            elif action == "restart":
                response = self.api_client.put("api/v1/node/restart")
            elif action == "remove":
                response = self.api_client.delete("api/v1/node/remove")
            else:
                logger.error(f"Unknown node action: {action}")
                return
            if response is not None and response.status_code == 200:
                logger.info(f"Node action '{action}' succeeded")
            else:
                logger.error(f"Node action '{action}' failed")
        except Exception as e:
            logger.error(f"Error performing node action '{action}': {e}")
