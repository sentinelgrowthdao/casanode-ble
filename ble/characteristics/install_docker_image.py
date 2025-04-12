#!/usr/bin/env python3
import dbus
import dbus.service
import threading
from enum import Enum
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class InstallStatus(Enum):
	NOT_STARTED = "0"
	IN_PROGRESS = "1"
	COMPLETED = "2"
	ERROR = "-1"

class InstallDockerImageCharacteristic(BaseCharacteristic):
	def __init__(self, bus, index, uuid):
		# This characteristic supports read and write operations.
		flags = ['read', 'write']
		super().__init__(bus, index, uuid, flags)
		self.service_path = '/org/bluez/example/service0'
		self.api_client = APIClient()

		# Initialize the installation status.
		self.install_status = InstallStatus.NOT_STARTED

		# Lock for thread-safety when modifying install_status.
		self.lock = threading.Lock()

	@dbus.service.method("org.bluez.GattCharacteristic1", in_signature="a{sv}", out_signature="ay")
	def ReadValue(self, options):
		"""
		Called by a client to read the current installation status.
		Returns the state as a list of dbus.Byte values.
		"""
		with self.lock:
			current_status = self.install_status.value
		logger.info(f"InstallDockerImageCharacteristic: reading status '{current_status}'")
		return [dbus.Byte(b) for b in current_status.encode("utf-8")]

	@dbus.service.method("org.bluez.GattCharacteristic1", in_signature="aya{sv}", out_signature="")
	def WriteValue(self, value, options):
		"""
		Called by a client to trigger the installation process.
		Expects the string 'install' to start the process.
		"""
		action = bytes(value).decode("utf-8").strip().lower()
		logger.info(f"InstallDockerImageCharacteristic: WriteValue called with action '{action}'")
		if action == "install":
			with self.lock:
				# Check if an installation is already in progress.
				if self.install_status == InstallStatus.IN_PROGRESS:
					logger.error("InstallDockerImageCharacteristic: Installation already in progress")
					return
				self.install_status = InstallStatus.IN_PROGRESS
			# Start the installation in a separate thread.
			threading.Thread(target=self._install_docker_image).start()
		else:
			logger.error(f"InstallDockerImageCharacteristic: Unknown action '{action}'")
			with self.lock:
				self.install_status = InstallStatus.ERROR

	def _install_docker_image(self):
		"""
		Calls the API to install the Docker image and updates the installation status accordingly.
		The API call uses a timeout of 60 seconds.
		"""
		try:
			response = self.api_client.post("api/v1/install/docker-image", timeout=60)
			with self.lock:
				if response is not None:
					self.install_status = InstallStatus.COMPLETED
					logger.info("InstallDockerImageCharacteristic: Installation succeeded")
				else:
					self.install_status = InstallStatus.ERROR
					logger.error("InstallDockerImageCharacteristic: Installation failed (no response)")
		except Exception as e:
			with self.lock:
				self.install_status = InstallStatus.ERROR
			logger.error(f"InstallDockerImageCharacteristic: Error installing docker image: {e}")
