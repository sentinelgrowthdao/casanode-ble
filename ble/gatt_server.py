#!/usr/bin/env python3
import dbus
import dbus.mainloop.glib
import dbus.service
import signal
import subprocess
import uuid
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
SERVICE_PATH = '/org/bluez/example/service0'

# Pour générer les UUID basés sur un seed
def generate_uuid_from_seed(characteristic_id: str) -> str:
    cfg = get_config()
    seed = cfg.get("BLE_CHARACTERISTIC_SEED")
    if seed is None:
        raise ValueError("La clé 'BLE_CHARACTERISTIC_SEED' doit être définie dans la configuration.")
    print(f"Generating UUID from seed: {seed}+{characteristic_id}")
    print(f"UUID {characteristic_id}: {str(uuid.uuid5(uuid.NAMESPACE_URL, f'{seed}+{characteristic_id}'))}")
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"{seed}+{characteristic_id}"))

# --- Partie Application GATT ---
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
    Implémente org.freedesktop.DBus.ObjectManager pour que BlueZ
    puisse récupérer tous les services GATT et caractéristiques.
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
                # On appelle get_properties() si défini dans la caractéristique
                response[char.get_path()] = getattr(char, 'get_properties', lambda: {})()
        return response

# --- Partie Advertisement ---
class Advertisement(dbus.service.Object):
    """
    Définit une publicité BLE pour rendre l'appareil visible.
    """
    PATH_BASE = "/org/bluez/example/advertisement"

    def __init__(self, bus, index):
        self.path = self.PATH_BASE + str(index)
        self.bus = bus
        self.type = "peripheral"
        # Le nom local est fixé ici (doit correspondre à vos attentes)
        self.local_name = "Casanode"
        # On utilise l'UUID du service tel que défini dans la config
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
        logger.info("Advertisement libéré.")

def register_advertisement(bus, adapter):
    """
    Enregistre l'annonce BLE via l'interface LEAdvertisingManager1.
    Retourne l'objet Advertisement et l'interface de gestion.
    """
    adapter_path = "/org/bluez/" + adapter
    ad_manager = dbus.Interface(bus.get_object(BLUEZ_SERVICE_NAME, adapter_path),
                                LE_ADVERTISING_MANAGER_IFACE)
    advertisement = Advertisement(bus, 0)
    ad_manager.RegisterAdvertisement(
        advertisement.path,
        {"Type": "peripheral"},
        reply_handler=lambda: logger.info("Advertising BLE actif."),
        error_handler=lambda error: logger.error(f"Erreur Advertising : {error}")
    )
    return advertisement, ad_manager

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

    # Ajouter le service à l'application
    app.services.append(service)

    adapter_path = "/org/bluez/hci0"
    service_manager = dbus.Interface(bus.get_object("org.bluez", adapter_path), GATT_MANAGER_IFACE)

    service_manager.RegisterApplication(app.path, {},
        reply_handler=lambda: logger.info("GATT application registered successfully"),
        error_handler=lambda e: logger.error(f"GATT application registration error: {e}"))

    # Enregistrer l'annonce BLE
    advertisement, ad_manager = register_advertisement(bus, "hci0")

    # Gestion du signal CTRL+C pour un nettoyage propre
    def signal_handler(sig, frame):
        logger.info("Ctrl+C détecté, désinscription de l'annonce BLE...")
        try:
            ad_manager.UnregisterAdvertisement(advertisement.path)
            logger.info("Advertisement désinscrite.")
            # On peut désactiver l'advertising système et réinitialiser l'interface si besoin
            subprocess.run(["sudo", "btmgmt", "advertising", "off"], check=True)
            subprocess.run(["sudo", "hciconfig", "hci0", "reset"], check=True)
            logger.info("Interface Bluetooth réinitialisée.")
        except Exception as e:
            logger.error("Erreur lors du nettoyage : %s", e)
        mainloop.quit()

    signal.signal(signal.SIGINT, signal_handler)

    logger.info("Serveur GATT et Advertisement BLE actif sur Raspberry Pi.")
    mainloop.run()

def main():
    dbus.mainloop.glib.DBusGMainLoop(set_as_default=True)
    bus = dbus.SystemBus()
    mainloop = GLib.MainLoop()
    register_app(bus, mainloop)

if __name__ == '__main__':
    main()
