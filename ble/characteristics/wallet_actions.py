#!/usr/bin/env python3
import dbus, dbus.service, threading, json
from characteristics.base import BaseCharacteristic
from utils import logger
from utils.api import APIClient

class WalletActionsCharacteristic(BaseCharacteristic):
	def __init__(self, bus, index, uuid):
		flags = ['read', 'write', 'notify']
		super().__init__(bus, index, uuid, flags)
		self.service_path = '/org/bluez/example/service0'
		self.api_client   = APIClient()
		self.notifying    = False
		self.result_json  = json.dumps({ 'status':'idle' })

	@dbus.service.method('org.bluez.GattCharacteristic1', in_signature='a{sv}', out_signature='ay')
	def ReadValue(self, _options):
		return [ dbus.Byte(b) for b in self.result_json.encode('utf-8') ]

	@dbus.service.method('org.bluez.GattCharacteristic1', in_signature='aya{sv}', out_signature='')
	def WriteValue(self, value, _options):
		action = bytes(value).decode('utf-8').strip().lower()
		if action == 'create':
			self.result_json = json.dumps({ 'status':'in_progress' })
			self._notify_clients()
			threading.Thread(target=self._create_wallet, daemon=True).start()
		elif action == 'remove':
			threading.Thread(target=self._remove_wallet, daemon=True).start()
		else:
			logger.error(f"WalletActionsCharacteristic: Unknown action '{action}'")

	def _create_wallet(self):
		try:
			resp = self.api_client.post('api/v1/wallet/create')
			if resp is None:
				raise RuntimeError('API unreachable')

			resp.raise_for_status()
			data = resp.json()
			if data.get('success') and data.get('mnemonic'):
				self.result_json = json.dumps({ 'status':'success', 'mnemonic':' '.join(data['mnemonic']) })
			else:
				self.result_json = json.dumps({ 'status':'error', 'message': data.get('message', 'unknown') })
		except Exception as e:
			logger.error(f"Wallet create error: {e}")
			self.result_json = json.dumps({ 'status':'error', 'message': str(e) })
		finally:
			self._notify_clients()

	def _remove_wallet(self):
		try:
			resp = self.api_client.delete('api/v1/wallet/remove')
			if resp is None:
				raise RuntimeError('API unreachable')
			resp.raise_for_status()
			logger.info('Wallet removed successfully')
		except Exception as e:
			logger.error(f"Wallet remove error: {e}")

	def _notify_clients(self):
		if not self.notifying:
			return
		arr = [ dbus.Byte(b) for b in self.result_json.encode('utf-8') ]
		self.PropertiesChanged('org.bluez.GattCharacteristic1', { 'Value': dbus.Array(arr, signature='y') }, [])

	@dbus.service.method('org.bluez.GattCharacteristic1', in_signature='', out_signature='')
	def StartNotify(self):
		self.notifying = True
		logger.info('WalletActionsCharacteristic: StartNotify')

	@dbus.service.method('org.bluez.GattCharacteristic1', in_signature='', out_signature='')
	def StopNotify(self):
		self.notifying = False
		logger.info('WalletActionsCharacteristic: StopNotify')