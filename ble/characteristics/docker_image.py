#!/usr/bin/env python3
import dbus
import dbus.service
import requests
from characteristics.base import BaseCharacteristic
from utils import logger, config
from utils.api import APIClient

class DockerImageCharacteristic(BaseCharacteristic):
    def __init__(self, bus, index, uuid):
        flags = ['read', 'write']
        super().__init__(bus, index, uuid, flags)
        self.service_path = '/org/bluez/example/service0'
        self.api_client = APIClient()
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="a{sv}", out_signature="ay")
    def ReadValue(self, options):
        response = self.api_client.get("api/v1/node/configuration")
        if response is not None:
            try:
                data = response.json()
                docker_image = data.get("dockerImage", "unknown")
                logger.info(f"DockerImageCharacteristic: Read dockerImage '{docker_image}' via REST API")
            except Exception as e:
                logger.error(f"DockerImageCharacteristic: Error reading dockerImage via REST API: {e}")
                docker_image = "error"
        else:
            docker_image = "error"
        return [dbus.Byte(b) for b in docker_image.encode("utf-8")]
    
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="aya{sv}", out_signature="")
    def WriteValue(self, value, options):
        response = self.api_client.post("api/v1/install/docker-image", timeout=30)
        if response is not None and response.status_code == 200:
            logger.info("DockerImageCharacteristic: Docker image downloaded successfully")
        else:
            logger.error("DockerImageCharacteristic: API request failed")
            raise dbus.DBusException("org.bluez.Error.UnlikelyError")
