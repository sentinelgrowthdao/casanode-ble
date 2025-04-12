#!/usr/bin/env python3
import dbus
import dbus.service
import threading
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class WalletActionsCharacteristic(BaseCharacteristic):
    def __init__(self, bus, index, uuid):
        flags = ['write']
        super().__init__(bus, index, uuid, flags)
        self.service_path = '/org/bluez/example/service0'
        self.api_client = APIClient()
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="aya{sv}", out_signature="")
    def WriteValue(self, value, options):
        action = bytes(value).decode("utf-8").strip().lower()
        threading.Thread(target=self._perform_wallet_action, args=(action,)).start()
    
    def _perform_wallet_action(self, action):
        try:
            if action == "remove":
                response = self.api_client.delete("api/v1/wallet/remove")
            else:
                logger.error(f"WalletActionsCharacteristic: Unknown action '{action}'")
                return

            if response is not None:
                response.raise_for_status()
                logger.info(f"Wallet action '{action}' succeeded")
            else:
                logger.error(f"WalletActionsCharacteristic: No response for action '{action}'")
        except Exception as e:
            logger.error(f"Error performing wallet action '{action}': {e}")
