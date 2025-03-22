#!/usr/bin/env python3
import re
import socket

# Regular expression for IPv4 and IPv6 addresses
ipv4_pattern = re.compile(
    r"^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\."
    r"(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\."
    r"(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\."
    r"(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
)

ipv6_pattern = re.compile(
    r"^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|"
    r"([0-9a-fA-F]{1,4}:){1,7}:|"
    r"([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|"
    r"([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|"
    r"([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|"
    r"([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|"
    r"([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|"
    r"[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|"
    r":((:[0-9a-fA-F]{1,4}){1,7}|:)|"
    r"fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|"
    r"::(ffff(:0{1,4}){0,1}:){0,1}"
    r"((25[0-5]|(2[0-4]|1?[0-9])[0-9])\.){3,3}"
    r"(25[0-5]|(2[0-4]|1?[0-9])[0-9])|"
    r"([0-9a-fA-F]{1,4}:){1,4}:"
    r"((25[0-5]|(2[0-4]|1?[0-9])[0-9])\.){3,3}"
    r"(25[0-5]|(2[0-4]|1?[0-9])[0-9]))$"
)

def is_valid_ip(ip: str) -> bool:
    """
    Check if the given string is a valid IP address.
    Returns True if the IP matches the IPv4 or IPv6 pattern.
    """
    return bool(ipv4_pattern.match(ip) or ipv6_pattern.match(ip))

def is_valid_dns(dns_name: str) -> bool:
    """
    Check if the given string is a valid and resolvable DNS.
    Attempts to resolve the DNS using socket.gethostbyname.
    Returns True if resolution succeeds, False otherwise.
    """
    try:
        socket.gethostbyname(dns_name)
        return True
    except Exception:
        return False
