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
        flags = ['read', 'write', 'notify']
        super().__init__(bus, index, uuid, flags)
        self.service_path = '/org/bluez/example/service0'
        self.api_client = APIClient()
        
        # balance_state holds the current state:
        # "0" = not started,
        # "1" = in progress,
        # a valid balance string (e.g. "123.45 USD") on success,
        # "-1" on error.
        self.balance_state = "0"
        self.notifying = False
        self.lock = threading.Lock()
    
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
            with self.lock:
                # Set status to "1" (in progress) and start the API call in a new thread.
                self.balance_state = "1"
            self._notify_clients()
            threading.Thread(target=self._fetch_balance, daemon=True).start()
        else:
            logger.error(f"NodeBalanceCharacteristic: Unknown command '{command}'")
            with self.lock:
                self.balance_state = "-1"
            self._notify_clients()
    
    def _fetch_balance(self):
        """
        Fetch the node's balance from the API.
        """
        try:
            resp = self.api_client.get("api/v1/node/balance")
            with self.lock:
                if resp and resp.ok:
                    bal = resp.json().get("balance")
                    self.balance_state = bal or "-1"
                else:
                    self.balance_state = "-1"
            logger.info(f"NodeBalanceCharacteristic: fetched '{self.balance_state}'")
        except Exception as e:
            with self.lock:
                self.balance_state = "-1"
            logger.error(f"NodeBalanceCharacteristic: Exception during fetch: {e}")
        finally:
            self._notify_clients()
    
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

    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="", out_signature="")
    def StartNotify(self):
        logger.info("NodeBalanceCharacteristic: StartNotify")
        self.notifying = True
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="", out_signature="")
    def StopNotify(self):
        logger.info("NodeBalanceCharacteristic: StopNotify")
        self.notifying = False
    
    def _notify_clients(self):
        """Sends a PropertiesChanged signal if a client is subscribed."""
        if not self.notifying:
            return
        with self.lock:
            arr = [dbus.Byte(b) for b in self.balance_state.encode()]
        self.PropertiesChanged(
            "org.bluez.GattCharacteristic1",
            {"Value": dbus.Array(arr, signature='y')},
            []
        )
