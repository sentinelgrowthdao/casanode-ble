#!/usr/bin/env python3
import requests
from urllib.parse import urlparse, urlunparse
from utils import config, logger
from utils.network import get_local_ip_address

class APIClient:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(APIClient, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized') and self._initialized:
            return
        self._initialized = True
        
        self.config = config.get_config()
        api_listen = self.config.get("API_LISTEN")
        local_ip = get_local_ip_address() or "127.0.0.1"
        
        parts = api_listen.split(":")
        port = parts[1] if len(parts) == 2 else "8081"
        
        self.base_url = f"https://{local_ip}:{port}"
        self.headers = {"Authorization": f"Bearer {self.config.get('API_AUTH')}"}
        
        certs_dir = self.config.get("CERTS_DIR")
        self.ca_cert = f"{certs_dir}/ca.crt"
        print(f"ca_cert: {self.ca_cert}")

    def request(self, method, path="", **kwargs):
        """
        Makes an HTTP request with the specified method and path.
        """
        url = f"{self.base_url}/{path.lstrip('/')}"
        timeout = kwargs.pop("timeout", 10)
        logger.info(f"request() -> {method} {url}, headers={self.headers} kwargs={kwargs}, timeout={timeout}")
        try:
            response = requests.request(
                method,
                url,
                headers=self.headers,
                verify=self.ca_cert,
                timeout=timeout,
                **kwargs
            )
            logger.info(f"HTTP call done, status_code={response.status_code}")
            response.raise_for_status()
            logger.info(f"{method} request to {url} succeeded with status {response.status_code}")
            return response
        except requests.exceptions.RequestException as e:
            logger.error(f"Error during {method} request to {url}: {e}")
            return None
    
    def get(self, path="", params=None, timeout=10):
        return self.request("GET", path, params=params, timeout=timeout)
    
    def post(self, path="", data=None, json=None, timeout=10):
        return self.request("POST", path, data=data, json=json, timeout=timeout)
    
    def put(self, path="", data=None, json=None, timeout=10):
        return self.request("PUT", path, data=data, json=json, timeout=timeout)
    
    def delete(self, path="", data=None, json=None, timeout=10):
        return self.request("DELETE", path, data=data, json=json, timeout=timeout)
