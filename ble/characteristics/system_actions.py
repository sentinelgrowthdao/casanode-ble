#!/usr/bin/env python3
import dbus
import dbus.service
import threading
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class SystemActionsCharacteristic(BaseCharacteristic):
	# This characteristic supports system actions like update, reboot, halt, etc.
	def __init__(self, bus, index, uuid):
		flags = ['read', 'write']
		super().__init__(bus, index, uuid, flags)
		self.service_path = '/org/bluez/example/service0'
		# Status values: "0" = not started, "1" = in progress, "2" = completed, "-1" = error
		self.action_status = "0"
		self.api_client = APIClient()
		# Lock for thread-safety when modifying action_status
		self.lock = threading.Lock()
	
	@dbus.service.method("org.bluez.GattCharacteristic1", in_signature="a{sv}", out_signature="ay")
	def ReadValue(self, options):
		"""
		Called by a client to read the current action status.
		Returns the status as a list of dbus.Byte values.
		"""
		with self.lock:
			current_status = self.action_status
		logger.info(f"SystemActionsCharacteristic: status '{current_status}'")
		return [dbus.Byte(b) for b in current_status.encode("utf-8")]
	
	@dbus.service.method("org.bluez.GattCharacteristic1", in_signature="aya{sv}", out_signature="")
	def WriteValue(self, value, options):
		"""
		Called by a client to trigger a system action.
		The command is expected to be one of: update-system, update-sentinel, reboot, halt, reset.
		"""
		action = bytes(value).decode("utf-8").strip().lower()
		with self.lock:
			self.action_status = "1"  # in progress
		# Start the system action in a separate thread.
		threading.Thread(target=self._perform_action, args=(action,)).start()
	
	def _perform_action(self, action):
		"""
		Performs the specified system action via an API call and updates the action status accordingly.
		"""
		try:
			if action == "update-system":
				payload = {"target": "system"}
				response = self.api_client.post("api/v1/system/update", json=payload)
			elif action == "update-sentinel":
				payload = {"target": "sentinel"}
				response = self.api_client.post("api/v1/system/update", json=payload)
			elif action == "reboot":
				response = self.api_client.post("api/v1/system/reboot")
			elif action == "halt":
				response = self.api_client.post("api/v1/system/shutdown")
			elif action == "reset":
				response = self.api_client.post("api/v1/system/reset")
			else:
				logger.error(f"Unknown system action: {action}")
				with self.lock:
					self.action_status = "-1"
				return

			# If a response is received, check its status code
			if response is not None:
				response.raise_for_status()
				with self.lock:
					self.action_status = "2"
				logger.info(f"System action '{action}' succeeded")
			else:
				with self.lock:
					self.action_status = "-1"
				logger.error(f"System action '{action}' failed: no response")
		except Exception as e:
			logger.error(f"Error performing system action '{action}': {e}")
			with self.lock:
				self.action_status = "-1"
