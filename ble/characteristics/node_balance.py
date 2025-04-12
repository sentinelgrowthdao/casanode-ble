#!/usr/bin/env python3
import dbus
import dbus.service
import threading
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class NodeBalanceCharacteristic(BaseCharacteristic):
    """
    A BLE characteristic for fetching the node's balance.
    
    The client starts the process by writing a command (e.g. "udvpn")
    to this characteristic. This triggers an asynchronous API call
    (to "api/v1/node/balance"). While the API call is in progress,
    ReadValue will return a status code ("1" for in progress, "0" for not started,
    "-1" for error). Once the balance is successfully fetched, ReadValue
    returns the balance in the format "<amount> <currency>".
    """
    
    def __init__(self, bus, index, uuid):
        flags = ['read', 'write']
        super().__init__(bus, index, uuid, flags)
        self.service_path = '/org/bluez/example/service0'
        self.api_client = APIClient()
        
        # balance_state holds the current state:
        # "0" = not started,
        # "1" = in progress,
        # a valid balance string (e.g. "123.45 USD") on success,
        # "-1" on error.
        self.balance_state = "0"
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="aya{sv}", out_signature="")
    def WriteValue(self, value, options):
        """
        Called by the client to initiate the balance fetching process.
        The client is expected to write a command (for example, "udvpn").
        """
        command = bytes(value).decode("utf-8").strip().lower()
        logger.info(f"NodeBalanceCharacteristic: Received command '{command}'")
        
        # Check for the expected command; adjust the command string if needed.
        if command == "udvpn":
            # Set status to "1" (in progress) and start the API call in a new thread.
            self.balance_state = "1"
            threading.Thread(target=self._fetch_balance).start()
        else:
            logger.error(f"NodeBalanceCharacteristic: Unknown command '{command}'")
            self.balance_state = "-1"
    
    def _fetch_balance(self):
        """
        Calls the API to fetch the node's balance and updates balance_state accordingly.
        """
        try:
            response = self.api_client.get("api/v1/node/balance")
            if response is not None:
                data = response.json()
                # Expecting the API to return JSON like: { "balance": "123.45 USD" }
                balance = data.get("balance")
                if balance:
                    self.balance_state = str(balance)
                    logger.info(f"NodeBalanceCharacteristic: Fetched balance '{balance}'")
                else:
                    self.balance_state = "-1"
                    logger.error("NodeBalanceCharacteristic: Balance not found in API response")
            else:
                self.balance_state = "-1"
                logger.error("NodeBalanceCharacteristic: No response from API")
        except Exception as e:
            self.balance_state = "-1"
            logger.error(f"NodeBalanceCharacteristic: Exception during balance fetch: {e}")
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="a{sv}", out_signature="ay")
    def ReadValue(self, options):
        """
        Returns the current balance state.
        When called by the client, this returns:
            - A status code ("0", "1", or "-1") if the balance is not yet available or on error,
            - The balance string (e.g., "123.45 USD") if the fetch was successful.
        """
        logger.info(f"NodeBalanceCharacteristic: Current balance state '{self.balance_state}'")
        return [dbus.Byte(b) for b in self.balance_state.encode("utf-8")]
