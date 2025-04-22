#!/usr/bin/env python3
import copy
import requests
from urllib.parse import urljoin
from utils import config, logger
from utils.network import get_local_ip_address

def sanitize_kwargs(kwargs: dict) -> dict:
    """
    Returns a copy of the kwargs where the value of the 'mnemonic' key 
    under the 'json' dictionary is replaced with [CENSORED] if it exists.
    """
    sanitized = copy.deepcopy(kwargs)
    if 'json' in sanitized and isinstance(sanitized['json'], dict):
        if 'mnemonic' in sanitized['json']:
            sanitized['json']['mnemonic'] = "[CENSORED]"
        if 'passphrase' in sanitized['json']:
            sanitized['json']['passphrase'] = "[CENSORED]"
    return sanitized

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
        
        # Load configuration
        self.config = config.get_config()
        self.headers = {"Authorization": f"Bearer {self.config.get('API_AUTH')}"}

        # Define the API listen address and port
        api_listen = self.config.get("API_LISTEN")
        parts = api_listen.split(":")
        self.port = parts[1] if len(parts) == 2 else "8081"
        
        # Define the CA certificate path
        certs_dir = self.config.get("CERTS_DIR")
        self.ca_cert = f"{certs_dir}/ca.crt"
    
    def _build_url(self, path=""):
        local_ip = get_local_ip_address() or "127.0.0.1"
        base_url = f"https://{local_ip}:{self.port}"
        return urljoin(base_url + "/", path)
    
    def request(self, method, path="", hide_sensitive=False, **kwargs):
        url = self._build_url(path.lstrip('/'))
        timeout = kwargs.pop("timeout", 10)
        
        # Retrieve a sanitized copy for logging.
        sanitized_kwargs = sanitize_kwargs(kwargs)
        
        if hide_sensitive:
            log_data = "[CENSORED]"
        else:
            log_data = sanitized_kwargs
            
        logger.info(f"request() -> {method} {url}, headers={self.headers} kwargs={log_data}, timeout={timeout}")
        
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
    
    def get(self, path="", params=None, timeout=10, hide_sensitive=False):
        return self.request("GET", path, hide_sensitive=hide_sensitive, params=params, timeout=timeout)
    
    def post(self, path="", data=None, json=None, timeout=10, hide_sensitive=False):
        return self.request("POST", path, hide_sensitive=hide_sensitive, data=data, json=json, timeout=timeout)
    
    def put(self, path="", data=None, json=None, timeout=10, hide_sensitive=False):
        return self.request("PUT", path, hide_sensitive=hide_sensitive, data=data, json=json, timeout=timeout)
    
    def delete(self, path="", data=None, json=None, timeout=10, hide_sensitive=False):
        return self.request("DELETE", path, hide_sensitive=hide_sensitive, data=data, json=json, timeout=timeout)
