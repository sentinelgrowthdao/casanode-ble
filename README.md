# Casanode BLE

Application for Bluetooth communication between phone and casanode node.

## Web server

The application listens to two network ports, one in HTTP that gives access to the QR Code connection and the other in HTTPS to enable requests to the REST APIs.

### Configuration

The parameters used to configure the web server are in the `/etc/casanode.conf` configuration file:

- `WEB_LISTEN`: Interface and listening port for the QR Code display page (in HTTP)
- `API_LISTEN`: Interface and listening port for APIs (in HTTPS)
- `API_AUTH`: Authentication token for using APIs

### Testing REST APIs

The commands below are examples of how to test the API. Replace the `<token>` with the value available in the `/etc/casanode.conf` configuration file in the `API_AUTH` attribute.

Node status

```bash
curl -X GET -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/status
```

Check Installation

```bash
curl -X GET -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/check/installation
```

Check Port

```bash
curl -X GET -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/check/port/node
curl -X GET -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/check/port/vpn
```

Renew Certificate SSL

```bash
curl -X POST -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/certificate/renew
```

Remove Certificate SSL

```bash
curl -X DELETE -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/certificate/remove
```

Node Status

```bash
curl -X PUT -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/node/status
```

Node Configuration

```bash
curl -X GET -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/node/configuration
```

Create Node Configuration

```bash
curl -X POST -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/install/configuration
```

Apply Configuration

```bash
curl -X PUT -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/node/configuration/apply -H "Content-Type: application/json" -d '{"moniker":"newMoniker", "backend":"file", "nodeType":"residential", "nodeIp":"x.x.x.x", "nodePort":12345, "vpnType":"wireguard", "vpnPort":51820, "maximumPeers":1000}'
```

Download Docker Image

```bash
curl -X POST -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/install/docker-image
```

Start Node

```bash
curl -X PUT -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/node/start
```

Stop Node

```bash
curl -X PUT -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/node/stop
```

Restart Node

```bash
curl -X PUT -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/node/restart
```

Node Address

```bash
curl -X GET -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/node/address
```

Node Balance

```bash
curl -X GET -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/node/balance
```

Set the Passphrase

```bash
curl -X POST -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/node/passphrase -H "Content-Type: application/json" -d '{"passphrase": "your_wallet_passphrase"}'
```

Check if passphrase is available

```bash
curl -X GET -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/node/passphrase
```

System Update

```bash
curl -X POST -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/system/update -H "Content-Type: application/json" -d '{"target": "system"}'
curl -X POST -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/system/update -H "Content-Type: application/json" -d '{"target": "sentinel"}'
```

System Reboot

```bash
curl -X POST -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/system/reboot
```

System Halt

```bash
curl -X POST -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/system/halt
```

System Reset

```bash
curl -X POST -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/system/reset
```

Wallet Address

```bash
curl -X GET -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/wallet/address
```

Create Wallet

```bash
curl -X POST -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/wallet/create
```

Restore Wallet

```bash
curl -X POST -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/wallet/restore
```

Remove Wallet

```bash
curl -X DELETE -H "Authorization: Bearer <token>" -k https://192.168.x.x:8081/api/v1/wallet/remove
```
