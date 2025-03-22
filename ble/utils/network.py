#!/usr/bin/env python3
import socket
import psutil

def get_local_ip_address():
    """
    Get the local IP address.
    Iterates over all network interfaces and returns the first non-internal IPv4 address.
    Returns None if no valid IP address is found.
    """
    interfaces = psutil.net_if_addrs()
    for interface_name, addresses in interfaces.items():
        for addr in addresses:
            # Check for an IPv4 address that is not a loopback address.
            if addr.family == socket.AF_INET and not addr.address.startswith("127."):
                return addr.address
    return None
