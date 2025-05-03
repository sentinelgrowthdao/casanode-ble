#!/usr/bin/env python3
import dbus
import dbus.service
import threading
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient
import json

class InstallConfigsCharacteristic(BaseCharacteristic):
    def __init__(self, bus, index, uuid):
        flags = ['read', 'write', 'notify']
        super().__init__(bus, index, uuid, flags)
        self.service_path = '/org/bluez/example/service0'
        # Status values: "0" = not started, "1" = in progress, "2"/"111" = success, "-1" = error
        self.config_status = "0"
        self.api_client = APIClient()
        # Lock for thread-safety when reading/writing the config_status
        self.lock = threading.Lock()
        # Initialize the notifying flag.
        self.notifying = False
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="a{sv}", out_signature="ay")
    def ReadValue(self, options):
        """
        Called by a client to read the current configuration installation status.
        Returns the state as a list of dbus.Byte values.
        """
        with self.lock:
            current_status = self.config_status
        logger.info(f"InstallConfigsCharacteristic: Status '{current_status}'")
        return [dbus.Byte(b) for b in current_status.encode('utf-8')]
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="aya{sv}", out_signature="")
    def WriteValue(self, value, options):
        """
        Called by a client to trigger the configuration installation.
        Expects the string 'create' to start the process.
        """
        command = bytes(value).decode('utf-8').strip().lower()
        if command != "create":
            logger.error("InstallConfigsCharacteristic: Invalid command")
            raise dbus.DBusException("org.bluez.Error.InvalidValue")
        with self.lock:
            self.config_status = "1"
        self._notify_clients()
        threading.Thread(target=self._install_configs, daemon=True).start()
    
    def _install_configs(self):
        """
        Calls the API to install the configuration and updates the status accordingly.
        """
        try:
            response = self.api_client.post("api/v1/install/configuration", timeout=60)
            if response is not None:
                if response.status_code == 200:
                    result = response.text.strip()
                    with self.lock:
                        config = json.loads(result)
                        node_status = "1" if config.get("nodeConfig", False) else "0"
                        vpn_status = "1" if config.get("vpnConfig", False) else "0"
                        certificate_status = "1" if config.get("certificate", False) else "0"
                        self.config_status = node_status + vpn_status + certificate_status
                    logger.info(f"InstallConfigsCharacteristic: Installation completed, status '{result}'")
                else:
                    with self.lock:
                        self.config_status = "-1"
                    logger.error(f"InstallConfigsCharacteristic: Installation failed with status code {response.status_code}")
            else:
                with self.lock:
                    self.config_status = "-1"
                logger.error("InstallConfigsCharacteristic: Installation failed (no response)")
            self._notify_clients()
        except Exception as e:
            with self.lock:
                self.config_status = "-1"
            logger.error(f"InstallConfigsCharacteristic: Exception during installation: {e}")
            self._notify_clients()
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="", out_signature="")
    def StartNotify(self):
        logger.info("[Configs] StartNotify")
        self.notifying = True

    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="", out_signature="")
    def StopNotify(self):
        logger.info("[Configs] StopNotify")
        self.notifying = False

    def _notify_clients(self):
        """Sends a PropertiesChanged if at least one client is subscribed."""
        if not self.notifying:
            return
        with self.lock:
            arr = [dbus.Byte(b) for b in self.config_status.encode('utf-8')]
        self.PropertiesChanged(
            "org.bluez.GattCharacteristic1",
            {"Value": dbus.Array(arr, signature='y')},
            []
        )