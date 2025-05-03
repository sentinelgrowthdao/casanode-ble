#!/usr/bin/env python3
import dbus
import dbus.service

class BaseCharacteristic(dbus.service.Object):
	PATH_BASE = '/org/bluez/example/characteristic'
	
	def __init__(self, bus, index, uuid, flags):
		self.path = self.PATH_BASE + str(index)
		self.uuid = uuid
		self.flags = flags
		dbus.service.Object.__init__(self, bus, self.path)
	
	def get_properties(self):
		return {
			'org.bluez.GattCharacteristic1': {
				'UUID': self.uuid,
				'Service': dbus.ObjectPath(self.service_path),
				'Flags': dbus.Array(self.flags, signature='s'),
			}
		}
	
	def get_path(self):
		return dbus.ObjectPath(self.path)
	
	@dbus.service.method("org.freedesktop.DBus.Properties", in_signature="s", out_signature="a{sv}")
	def GetAll(self, interface):
		if interface != "org.bluez.GattCharacteristic1":
			raise Exception("Invalid interface requested")
		return self.get_properties()["org.bluez.GattCharacteristic1"]
	
	@dbus.service.signal(dbus_interface='org.freedesktop.DBus.Properties', signature='sa{sv}as')
	def PropertiesChanged(self, interface, changed, invalidated):
		pass
	
	# @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="", out_signature="")
	# def StartNotify(self):
	# 	pass
	
	# @dbus.service.method("org.bluez.GattCharacteristic1", in_signature="", out_signature="")
	# def StopNotify(self):
	# 	pass
