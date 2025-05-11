#!/usr/bin/env python3
import dbus
import dbus.service
import struct
import hashlib
import json
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class WalletMnemonicCharacteristic(BaseCharacteristic):
    """
    A BLE characteristic to read or write the node's mnemonic in multiple chunks.
    - Read (chunked): 
        1) First read => 4 bytes of length (little-endian).
        2) Subsequent reads => the actual data (mnemonic + space + hash).
    - Write (chunked): 
        1) First write => 4 bytes of length (little-endian).
        2) Subsequent writes => the actual data (mnemonic + space + hash).
    """
    CHUNK_SIZE = 20

    def __init__(self, bus, index, uuid):
        flags = ['read', 'write']
        super().__init__(bus, index, uuid, flags)
        self.service_path = '/org/bluez/example/service0'
        self.api_client = APIClient()
        
        # For writing
        self._expected_length = None            # Number of bytes we expect to receive
        self._write_buffer = bytearray()        # Accumulates the data chunks
        
        # For reading
        self._mnemonic_data = b""               # The data to send in chunked form (mnemonic + space + hash)
        self._read_offset = 0                   # How many bytes have been read so far
        self._reading_length_sent = False       # Indicates if we have already sent the 4-byte length

    # ------------------------------------------------------------------
    #                         READ PART
    # ------------------------------------------------------------------
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="a{sv}", out_signature="ay")
    def ReadValue(self, options):
        """
        The client will call this repeatedly to get all chunks.
        1) We first call /wallet/create to create a new wallet if we haven't built the mnemonic_data buffer yet.
        2) We then send 4 bytes for the total size on the first read.
        3) Subsequent reads return the chunked data (20 bytes max).
        """
        # If we have no mnemonic data prepared (read_offset==0 and reading_length_sent==False),
        # let's call the wallet create API to get a new mnemonic.
        if not self._reading_length_sent and self._read_offset == 0:
            self._prepare_mnemonic_from_api()
        
        # If there's still nothing to send (error or something else), send "error"
        if not self._mnemonic_data:
            logger.info("NodeMnemonicCharacteristic: No mnemonic data available (error?)")
            return [dbus.Byte(b) for b in b"error"]
        
        # If we haven't sent the 4-byte length yet, do so
        if not self._reading_length_sent:
            length_bytes = struct.pack("<I", len(self._mnemonic_data))  # 4 bytes, little-endian
            self._reading_length_sent = True
            logger.info(f"NodeMnemonicCharacteristic: Sending length {len(self._mnemonic_data)}")
            return [dbus.Byte(b) for b in length_bytes]
        
        # Otherwise, send up to CHUNK_SIZE bytes from our _mnemonic_data
        start_index = self._read_offset
        end_index = start_index + self.CHUNK_SIZE
        chunk = self._mnemonic_data[start_index:end_index]
        self._read_offset += len(chunk)
        
        logger.info(f"NodeMnemonicCharacteristic: Sending chunk of size {len(chunk)} (offset={start_index})")
        
        # If we've finished sending everything, reset state for next time
        if self._read_offset >= len(self._mnemonic_data):
            logger.info("NodeMnemonicCharacteristic: Finished sending all mnemonic data, resetting offsets")
            self._read_offset = 0
            self._reading_length_sent = False
            # In some cases, you might clear self._mnemonic_data = b"" if you only want it read once
            # self._mnemonic_data = b""
        
        return [dbus.Byte(b) for b in chunk]
    
    def _prepare_mnemonic_from_api(self):
        """
        Calls /api/v1/wallet/create to create a new wallet and retrieve the mnemonic array.
        On success, builds the string "<mnemonic> <hash>" for chunked sending.
        On error, sets self._mnemonic_data to b"error".
        """
        try:
            response = self.api_client.post("api/v1/wallet/create", timeout=30)
            if response is None:
                logger.error("NodeMnemonicCharacteristic: No response from /wallet/create")
                self._mnemonic_data = b"error"
                return
            
            if response.status_code != 200:
                logger.error(f"NodeMnemonicCharacteristic: Failed to create wallet, status {response.status_code}")
                self._mnemonic_data = b"error"
                return
            
            # Parse the JSON to get the mnemonic array
            data = response.json()
            if not data.get("success"):
                logger.error("NodeMnemonicCharacteristic: API returned success=false")
                self._mnemonic_data = b"error"
                return
            
            mnemonic_list = data.get("mnemonic", [])
            if not isinstance(mnemonic_list, list) or not mnemonic_list:
                logger.error("NodeMnemonicCharacteristic: Invalid or empty mnemonic in API response")
                self._mnemonic_data = b"error"
                return
            
            # Join the words to form a single string
            mnemonic_str = " ".join(mnemonic_list)
            # Calculate the hash
            hash_str = hashlib.sha256(mnemonic_str.encode("utf-8")).hexdigest()
            # Store "<mnemonic> <hash>"
            data_str = f"{mnemonic_str} {hash_str}"
            self._mnemonic_data = data_str.encode("utf-8")
            logger.info("NodeMnemonicCharacteristic: Wallet created, mnemonic data prepared for reading.")
        except Exception as e:
            logger.error(f"NodeMnemonicCharacteristic: Exception calling /wallet/create: {e}")
            self._mnemonic_data = b"error"

    # ------------------------------------------------------------------
    #                        WRITE PART
    # ------------------------------------------------------------------
    @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="aya{sv}", out_signature="")
    def WriteValue(self, value, options):
        """
        The client will call this repeatedly to send all chunks.
        1) The first write is 4 bytes (little-endian) for the total length.
        2) Subsequent writes are chunks of data (mnemonic + space + hash).
        3) Once we've received the entire data, we verify the hash and then restore the wallet.
        """
        data = bytes(value)
        
        # If we don't yet know how many bytes to expect, we assume the first 4-byte chunk is the length
        if self._expected_length is None:
            if len(data) != 4:
                # If the first write isn't exactly 4 bytes, it's an error in protocol
                logger.error("NodeMnemonicCharacteristic: Expected 4 bytes for length, got something else")
                return
            self._expected_length = struct.unpack("<I", data)[0]  # little-endian uint32
            logger.info(f"NodeMnemonicCharacteristic: Expecting {self._expected_length} bytes of mnemonic data for restore")
            self._write_buffer = bytearray()
        else:
            # Accumulate the data chunk
            logger.info(f"NodeMnemonicCharacteristic: Received chunk of size {len(data)}")
            self._write_buffer.extend(data)
            
            # If we have all the data, parse and restore
            if len(self._write_buffer) >= self._expected_length:
                logger.info("NodeMnemonicCharacteristic: All chunks received, verifying mnemonic + hash for restore")
                self._handle_full_mnemonic_data()
                # Reset for next time
                self._expected_length = None
                self._write_buffer = bytearray()

    def _handle_full_mnemonic_data(self):
        """
        Once we've received the full data from the client, we split out the mnemonic from the hash,
        verify integrity, and if correct, call the wallet restore API.
        """
        full_str = self._write_buffer.decode("utf-8", errors="replace")
        # The client code appends: "<mnemonic> <hash>"
        # We'll find the last space and separate the two
        try:
            last_space_idx = full_str.rindex(" ")
            mnemonic = full_str[:last_space_idx]
            received_hash = full_str[last_space_idx + 1:]
            
            # Verify the hash
            calculated_hash = hashlib.sha256(mnemonic.encode("utf-8")).hexdigest()
            if calculated_hash == received_hash:
                # If valid, call the wallet restore API
                logger.info("NodeMnemonicCharacteristic: Hash valid, restoring wallet...")
                payload = {"mnemonic": mnemonic}
                resp = self.api_client.post("api/v1/wallet/restore", json=payload, timeout=30)
                if resp is not None and resp.status_code == 200:
                    logger.info("NodeMnemonicCharacteristic: Wallet restore successful")
                else:
                    logger.error(f"NodeMnemonicCharacteristic: Wallet restore failed, status code="
                                f" {resp.status_code if resp else 'None'}")
            else:
                logger.error("NodeMnemonicCharacteristic: Hash mismatch, mnemonic not restored")
        
        except ValueError:
            logger.error("NodeMnemonicCharacteristic: Invalid mnemonic + hash format (no space found)")
