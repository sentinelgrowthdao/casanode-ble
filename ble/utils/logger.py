#!/usr/bin/env python3
import logging
import sys
import os
from utils import config

conf = config.get_config()
log_dir = conf.get("LOG_DIR", "/var/log/casanode")
log_file = os.path.join(log_dir, "ble.log")

logger = logging.getLogger("CasanodeBle")
logger.setLevel(logging.INFO)

fh = logging.FileHandler(log_file)
fh.setLevel(logging.INFO)

ch = logging.StreamHandler(sys.stdout)
ch.setLevel(logging.INFO)

formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
fh.setFormatter(formatter)
ch.setFormatter(formatter)

logger.addHandler(fh)
logger.addHandler(ch)

def info(message):
    logger.info(message)

def error(message):
    logger.error(message)
