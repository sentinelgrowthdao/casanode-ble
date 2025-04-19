#!/usr/bin/env python3
import dbus
import dbus.mainloop.glib
import dbus.service
from dbus import String
from dbus.exceptions import DBusException
import signal
import subprocess
import uuid
import time
from gi.repository import GLib
from utils.config import get_config
from utils import logger
from characteristics.moniker import MonikerCharacteristic
from characteristics.cert_expirity import CertExpirityCharacteristic
from characteristics.node_port import NodePortCharacteristic
from characteristics.node_type import NodeTypeCharacteristic
from characteristics.discovery import DiscoveryCharacteristic
from characteristics.docker_image import DockerImageCharacteristic
from characteristics.install_docker_image import InstallDockerImageCharacteristic
from characteristics.install_configs import InstallConfigsCharacteristic
from characteristics.vpn_port import VpnPortCharacteristic
from characteristics.vpn_type import VpnTypeCharacteristic
from characteristics.max_peers import MaxPeersCharacteristic
from characteristics.wallet_actions import WalletActionsCharacteristic
from characteristics.node_keyring_backend import NodeKeyringBackendCharacteristic
from characteristics.online_users import OnlineUsersCharacteristic
from characteristics.node_ip import NodeIpCharacteristic
from characteristics.node_address import NodeAddressCharacteristic
from characteristics.node_balance import NodeBalanceCharacteristic
from characteristics.node_status import NodeStatusCharacteristic
from characteristics.node_location import NodeLocationCharacteristic
from characteristics.wallet_mnemonic import WalletMnemonicCharacteristic
from characteristics.wallet_address import WalletAddressCharacteristic
from characteristics.system_actions import SystemActionsCharacteristic
from characteristics.system_uptime import SystemUptimeCharacteristic
from characteristics.casanode_version import CasanodeVersionCharacteristic
from characteristics.system_arch import SystemArchCharacteristic
from characteristics.system_os import SystemOsCharacteristic
from characteristics.system_kernel import SystemKernelCharacteristic
from characteristics.bandwidth_speed import BandwidthSpeedCharacteristic
from characteristics.wallet_passphrase import WalletPassphraseCharacteristic
from characteristics.check_port import CheckPortCharacteristic
from characteristics.certificate_actions import CertificateActionsCharacteristic
from characteristics.node_actions import NodeActionsCharacteristic
from characteristics.check_installation import CheckInstallationCharacteristic

BLUEZ_SERVICE_NAME = 'org.bluez'
LE_ADVERTISING_MANAGER_IFACE = 'org.bluez.LEAdvertisingManager1'
LE_ADVERTISEMENT_IFACE = 'org.bluez.LEAdvertisement1'
GATT_MANAGER_IFACE = "org.bluez.GattManager1"
ADAPTER_IFACE = "org.bluez.Adapter1"
SERVICE_PATH = '/org/bluez/example/service0'

# To generate UUIDs based on a seed
def generate_uuid_from_seed(characteristic_id: str) -> str:
    cfg = get_config()
    seed = cfg.get("BLE_CHARACTERISTIC_SEED")
    if seed is None:
        raise ValueError("The key 'BLE_CHARACTERISTIC_SEED' must be set in the configuration.")
    print(f"Generating UUID from seed: {seed}+{characteristic_id}")
    print(f"UUID {characteristic_id}: {str(uuid.uuid5(uuid.NAMESPACE_URL, f'{seed}+{characteristic_id}'))}")
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"{seed}+{characteristic_id}"))

# GATT Application Section
class CasanodeService(dbus.service.Object):
    def __init__(self, bus, index, uuid_str, primary):
        self.path = f"/org/bluez/example/service{index}"
        self.uuid = uuid_str
        self.primary = primary
        self.characteristics = []
        dbus.service.Object.__init__(self, bus, self.path)

    def get_properties(self):
        return {
            "org.bluez.GattService1": {
                "UUID": self.uuid,
                "Primary": self.primary,
                "Characteristics": dbus.Array([ch.get_path() for ch in self.characteristics], signature='o')
            }
        }

    def get_path(self):
        return dbus.ObjectPath(self.path)

class Application(dbus.service.Object):
    """
    Implements org.freedesktop.DBus.ObjectManager so BlueZ
    can retrieve all GATT services and characteristics.
    """
    PATH = "/org/bluez/example"
    
    def __init__(self, bus):
        self.path = self.PATH
        self.services = []
        dbus.service.Object.__init__(self, bus, self.PATH)

    @dbus.service.method("org.freedesktop.DBus.ObjectManager", out_signature="a{oa{sa{sv}}}")
    def GetManagedObjects(self):
        response = {}
        for service in self.services:
            response[service.get_path()] = service.get_properties()
            for char in service.characteristics:
                # Call get_properties() if defined in the characteristic
                response[char.get_path()] = getattr(char, 'get_properties', lambda: {})()
        return response

# --- Advertisement Section ---
class Advertisement(dbus.service.Object):
    """
    Defines a BLE advertisement to make the device visible.
    """
    PATH_BASE = "/org/bluez/example/advertisement"

    def __init__(self, bus, index):
        self.path = self.PATH_BASE + str(index)
        self.bus = bus
        self.type = "peripheral"
        # The local name is set here (must match your expectations)
        self.local_name = "Casanode"
        # Use the service UUID as defined in the config
        self.service_uuids = [get_config().get("BLE_UUID", "00001820-0000-1000-8000-00805f9b34fb")]
        dbus.service.Object.__init__(self, bus, self.path)

    def get_properties(self):
        return {
            LE_ADVERTISEMENT_IFACE: {
                'Type': self.type,
                'ServiceUUIDs': self.service_uuids,
                'LocalName': self.local_name,
                'Includes': dbus.Array(['tx-power'], signature='s'),
                'Flags': dbus.Byte(0x06),
            }
        }

    @dbus.service.method("org.freedesktop.DBus.Properties", in_signature="ss", out_signature="v")
    def Get(self, interface, prop):
        props = self.get_properties()[interface]
        if prop in props:
            return props[prop]
        raise Exception("Property %s not found" % prop)

    @dbus.service.method("org.freedesktop.DBus.Properties", in_signature="s", out_signature="a{sv}")
    def GetAll(self, interface):
        if interface != LE_ADVERTISEMENT_IFACE:
            raise Exception("Invalid interface %s" % interface)
        return self.get_properties()[LE_ADVERTISEMENT_IFACE]

    @dbus.service.method(LE_ADVERTISEMENT_IFACE, in_signature="", out_signature="")
    def Release(self):
        logger.info("Advertisement released.")

def register_advertisement(bus, adapter):
    """
    Registers the BLE advertisement via the LEAdvertisingManager1 interface.
    Returns the Advertisement object and the management interface.
    """
    # Ensure the adapter is powered on
    ensure_adapter_powered(bus, adapter)
    
    # Get the LEAdvertisingManager1 interface
    adapter_path = f"/org/bluez/{adapter}"
    
    # Set the adapter’s Alias so that BLE scanners see “Casanode”
    adapter_props = dbus.Interface(
        bus.get_object(BLUEZ_SERVICE_NAME, adapter_path),
        "org.freedesktop.DBus.Properties",
    )
    adapter_props.Set(
        "org.bluez.Adapter1",
        "Alias",
        String(get_config().get("BLENO_DEVICE_NAME", "Casanode")),
    )
    
    # Get the LEAdvertisingManager1 interface
    ad_manager = dbus.Interface(
        bus.get_object(BLUEZ_SERVICE_NAME, adapter_path),
        LE_ADVERTISING_MANAGER_IFACE,
    )
    
    # Create the advertisement object
    advertisement = Advertisement(bus, 0)
    props = dbus.Dictionary({"Type": "peripheral"}, signature="sv")
    
    # Register the advertisement
    ad_manager.RegisterAdvertisement(
        advertisement.path,
        props,
        reply_handler=lambda: logger.info("BLE advertising active."),
        error_handler=lambda error: logger.error(f"Advertising error: {error}")
    )
    return advertisement, ad_manager

def ensure_adapter_powered(
    bus: dbus.Bus,
    adapter: str = "hci0",
    timeout: float = 8.0,
    retry_delay: float = 0.25,
) -> None:
    """
    Ensure the Bluetooth adapter is powered *and* exposes LEAdvertisingManager1.
    Retries politely when BlueZ reports org.bluez.Error.Busy.
    """
    adapter_path = f"/org/bluez/{adapter}"
    props = dbus.Interface(
        bus.get_object(BLUEZ_SERVICE_NAME, adapter_path),
        "org.freedesktop.DBus.Properties",
    )

    # ---- STEP 0: make sure the adapter isn't RF‑blocked (optional) --------
    # subprocess.run(["rfkill", "unblock", "bluetooth"], check=False)

    # ---- STEP 1: power the adapter on --------------------------------------
    start = time.time()
    while True:
        powered = props.Get(ADAPTER_IFACE, "Powered")
        if powered:
            break

        try:
            logger.info(f"Adapter {adapter} is off; powering on…")
            props.Set(
                ADAPTER_IFACE,
                "Powered",
                dbus.Boolean(True, variant_level=1),
            )
        except DBusException as exc:
            # BlueZ returns Busy while it (re)initialises the controller
            if "org.bluez.Error.Busy" in exc.get_dbus_name() or "Busy" in str(exc):
                if time.time() - start > timeout:
                    raise RuntimeError(
                        f"Adapter {adapter} stayed busy for {timeout}s"
                    ) from exc
                time.sleep(retry_delay)
                continue
            raise

        # give BlueZ a tiny moment before re‑checking Powered
        time.sleep(retry_delay)

    # ---- STEP 2: wait for LEAdvertisingManager1 to appear ------------------
    obj_mgr = dbus.Interface(
        bus.get_object(BLUEZ_SERVICE_NAME, "/"),
        "org.freedesktop.DBus.ObjectManager",
    )

    start = time.time()
    while True:
        for path, ifaces in obj_mgr.GetManagedObjects().items():
            if LE_ADVERTISING_MANAGER_IFACE in ifaces:
                return            # success!

        if time.time() - start > timeout:
            raise RuntimeError(
                f"{LE_ADVERTISING_MANAGER_IFACE} not exposed after {timeout}s"
            )
        time.sleep(retry_delay)

def register_app(bus, mainloop):
    # Create the main application
    app = Application(bus)
    cfg = get_config()
    service = CasanodeService(bus, 0, cfg['BLE_UUID'], True)

    discovery = DiscoveryCharacteristic(bus, 5, cfg['BLE_DISCOVERY_UUID'])
    discovery.service = service
    service.characteristics.append(discovery)

    nodeStatus = NodeStatusCharacteristic(bus, 6, generate_uuid_from_seed("node-status"))
    nodeStatus.service = service
    service.characteristics.append(nodeStatus)

    moniker = MonikerCharacteristic(bus, 7, generate_uuid_from_seed("moniker"))
    moniker.service = service
    service.characteristics.append(moniker)

    nodeType = NodeTypeCharacteristic(bus, 8, generate_uuid_from_seed("node-type"))
    nodeType.service = service
    service.characteristics.append(nodeType)

    nodeIp = NodeIpCharacteristic(bus, 9, generate_uuid_from_seed("node-ip"))
    nodeIp.service = service
    service.characteristics.append(nodeIp)

    nodePort = NodePortCharacteristic(bus, 10, generate_uuid_from_seed("node-port"))
    nodePort.service = service
    service.characteristics.append(nodePort)

    vpnType = VpnTypeCharacteristic(bus, 11, generate_uuid_from_seed("vpn-type"))
    vpnType.service = service
    service.characteristics.append(vpnType)

    vpnPort = VpnPortCharacteristic(bus, 12, generate_uuid_from_seed("vpn-port"))
    vpnPort.service = service
    service.characteristics.append(vpnPort)

    maxPeers = MaxPeersCharacteristic(bus, 13, generate_uuid_from_seed("max-peers"))
    maxPeers.service = service
    service.characteristics.append(maxPeers)

    nodeLocation = NodeLocationCharacteristic(bus, 14, generate_uuid_from_seed("node-location"))
    nodeLocation.service = service
    service.characteristics.append(nodeLocation)

    certExpirity = CertExpirityCharacteristic(bus, 15, generate_uuid_from_seed("cert-expirity"))
    certExpirity.service = service
    service.characteristics.append(certExpirity)

    onlineUsers = OnlineUsersCharacteristic(bus, 16, generate_uuid_from_seed("online-users"))
    onlineUsers.service = service
    service.characteristics.append(onlineUsers)

    bandwidthSpeed = BandwidthSpeedCharacteristic(bus, 17, generate_uuid_from_seed("bandwidth-speed"))
    bandwidthSpeed.service = service
    service.characteristics.append(bandwidthSpeed)

    systemUptime = SystemUptimeCharacteristic(bus, 18, generate_uuid_from_seed("system-uptime"))
    systemUptime.service = service
    service.characteristics.append(systemUptime)

    casanodeVersion = CasanodeVersionCharacteristic(bus, 19, generate_uuid_from_seed("casanode-version"))
    casanodeVersion.service = service
    service.characteristics.append(casanodeVersion)

    dockerImage = DockerImageCharacteristic(bus, 20, generate_uuid_from_seed("docker-image"))
    dockerImage.service = service
    service.characteristics.append(dockerImage)

    installDockerImage = InstallDockerImageCharacteristic(bus, 21, generate_uuid_from_seed("install-docker-image"))
    installDockerImage.service = service
    service.characteristics.append(installDockerImage)

    systemOs = SystemOsCharacteristic(bus, 22, generate_uuid_from_seed("system-os"))
    systemOs.service = service
    service.characteristics.append(systemOs)

    systemArch = SystemArchCharacteristic(bus, 23, generate_uuid_from_seed("system-arch"))
    systemArch.service = service
    service.characteristics.append(systemArch)

    systemKernel = SystemKernelCharacteristic(bus, 24, generate_uuid_from_seed("system-kernel"))
    systemKernel.service = service
    service.characteristics.append(systemKernel)

    installConfigs = InstallConfigsCharacteristic(bus, 25, generate_uuid_from_seed("install-configs"))
    installConfigs.service = service
    service.characteristics.append(installConfigs)

    walletActions = WalletActionsCharacteristic(bus, 26, generate_uuid_from_seed("wallet-actions"))
    walletActions.service = service
    service.characteristics.append(walletActions)
    
    nodeKeyringBackend = NodeKeyringBackendCharacteristic(bus, 27, generate_uuid_from_seed("node-keyring-backend"))
    nodeKeyringBackend.service = service
    service.characteristics.append(nodeKeyringBackend)

    nodeAddress = NodeAddressCharacteristic(bus, 28, generate_uuid_from_seed("node-address"))
    nodeAddress.service = service
    service.characteristics.append(nodeAddress)
    
    nodeBalance = NodeBalanceCharacteristic(bus, 29, generate_uuid_from_seed("node-balance"))
    nodeBalance.service = service
    service.characteristics.append(nodeBalance)

    nodeMnemonic = WalletMnemonicCharacteristic(bus, 30, generate_uuid_from_seed("wallet-mnemonic"))
    nodeMnemonic.service = service
    service.characteristics.append(nodeMnemonic)

    publicAddress = WalletAddressCharacteristic(bus, 31, generate_uuid_from_seed("wallet-address"))
    publicAddress.service = service
    service.characteristics.append(publicAddress)

    systemActions = SystemActionsCharacteristic(bus, 32, generate_uuid_from_seed("system-actions"))
    systemActions.service = service
    service.characteristics.append(systemActions)

    nodePassphrase = WalletPassphraseCharacteristic(bus, 33, generate_uuid_from_seed("node-passphrase"))
    nodePassphrase.service = service
    service.characteristics.append(nodePassphrase)

    checkPort = CheckPortCharacteristic(bus, 34, generate_uuid_from_seed("check-port"))
    checkPort.service = service
    service.characteristics.append(checkPort)

    certificateActions = CertificateActionsCharacteristic(bus, 35, generate_uuid_from_seed("certificate-actions"))
    certificateActions.service = service
    service.characteristics.append(certificateActions)

    nodeActions = NodeActionsCharacteristic(bus, 36, generate_uuid_from_seed("node-actions"))
    nodeActions.service = service
    service.characteristics.append(nodeActions)

    checkInstallation = CheckInstallationCharacteristic(bus, 37, generate_uuid_from_seed("check-installation"))
    checkInstallation.service = service
    service.characteristics.append(checkInstallation)

    # Add the service to the application
    app.services.append(service)

    adapter_path = "/org/bluez/hci0"
    service_manager = dbus.Interface(bus.get_object("org.bluez", adapter_path), GATT_MANAGER_IFACE)

    service_manager.RegisterApplication(
        app.path, {},
        reply_handler=lambda: logger.info("GATT application registered successfully"),
        error_handler=lambda e: logger.error(f"GATT application registration error: {e}"),
    )

    # Register the BLE advertisement
    advertisement, ad_manager = register_advertisement(bus, "hci0")

    # Handle CTRL+C signal for clean up
    def signal_handler(sig, frame):
        logger.info("Ctrl+C detected, unregistering BLE advertisement...")
        try:
            ad_manager.UnregisterAdvertisement(advertisement.path)
            logger.info("Advertisement unregistered.")
            # You can disable system advertising and reset the interface if needed
            subprocess.run(["sudo", "btmgmt", "advertising", "off"], check=False)
            subprocess.run(["sudo", "hciconfig", "hci0", "reset"], check=False)
            logger.info("Bluetooth interface reset.")
        except Exception as exc:
            logger.error(f"Error during cleanup: {exc}")
        finally:
            mainloop.quit()

    signal.signal(signal.SIGINT, signal_handler)

    logger.info("GATT server and BLE Advertisement active on Raspberry Pi.")
    mainloop.run()

def main():
    dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)
    bus = dbus.SystemBus()
    mainloop = GLib.MainLoop()
    register_app(bus, mainloop)

if __name__ == '__main__':
    main()
