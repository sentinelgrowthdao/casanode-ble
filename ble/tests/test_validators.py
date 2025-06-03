import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.validators import is_valid_ip


def test_is_valid_ip_valid_ipv4():
    assert is_valid_ip('192.168.0.1')


def test_is_valid_ip_invalid():
    assert not is_valid_ip('999.999.999.999')
