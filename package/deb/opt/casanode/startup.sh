#!/bin/bash

CONFIGFILE="/etc/casanode.conf"
LOGFILE="/var/log/casanode/startup.log"
LOGFILE_ROOTLESS="/var/log/casanode/rootless.log"
USER="casanode"
UID_USER=$(id -u "$USER")
FLAGFILE="/opt/$USER/.docker_rootless_installed"

# Clear the log file at the start of each execution
> "$LOGFILE"
echo "=== Casanode startup begin ===" | tee -a "$LOGFILE"

# Stop bluetoothd to release lock files
echo "Stopping bluetooth service…" | tee -a "$LOGFILE"
systemctl stop bluetooth.service

# Clean up stale BlueZ GATT database to avoid registration errors
if [ -d /var/lib/bluetooth ]
then
	echo "Cleaning up BlueZ GATT database…" | tee -a "$LOGFILE"
	for adapter in /var/lib/bluetooth/*
	do
		gatt_dir="$adapter/gatt"
		cache_dir="$adapter/cache"
		
		if [ -d "$gatt_dir" ]
		then
			rm -rf "$gatt_dir" \
			&& echo "Removed $gatt_dir" | tee -a "$LOGFILE"
		fi

		if [ -d "$cache_dir" ]
		then
			rm -rf "$cache_dir" \
			&& echo "Removed $cache_dir" | tee -a "$LOGFILE"
		fi
	done
fi

# Restart bluetoothd so it can recreate its database cleanly
echo "Restarting bluetooth service…" | tee -a "$LOGFILE"
systemctl start bluetooth.service

# Start the systemd-user instance for casanode
echo "Launching user@$UID_USER.service…" | tee -a "$LOGFILE"
systemctl start user@"$UID_USER".service || {
	echo "✗ Unable to start user@$UID_USER.service" | tee -a "$LOGFILE"
	exit 1
}

# Wait for the D-Bus bus to appear (max 5s)
echo "Waiting for /run/user/$UID_USER/bus…" | tee -a "$LOGFILE"
for i in {1..10}; do
	su - "$USER" -s /bin/bash -c \
	  "XDG_RUNTIME_DIR=/run/user/$UID_USER systemctl --user is-system-running --quiet"
	[ $? -le 1 ] && break   # 0=running, 1=degraded → ok
	sleep 1
done
if ! [ -S "/run/user/$UID_USER/bus" ]; then
	echo "✗ D-Bus bus still missing, aborting." | tee -a "$LOGFILE"; exit 1
fi

# Always export the variable for 'su - casanode' commands
export XDG_RUNTIME_DIR="/run/user/$UID_USER"

# Install Docker rootless if necessary
if [ ! -f "$FLAGFILE" ]; then
	echo "Docker rootless not installed. Installing…" | tee -a "$LOGFILE"
	
	# Stop Docker rootful
	echo "  → Stopping rootful Docker..." | tee -a "$LOGFILE"
	systemctl disable --now docker.service docker.socket &>>"$LOGFILE"
	rm -f /var/run/docker.sock                                 &>>"$LOGFILE"
	echo "  → Rootful Docker stopped." | tee -a "$LOGFILE"
	
	# Enable linger
	loginctl enable-linger "$USER" &>>"$LOGFILE"
	echo "  → Linger enabled for $USER." | tee -a "$LOGFILE"
	
	# Add entries to /etc/subuid and /etc/subgid if they do not already exist
	grep -q "^${USER}:" /etc/subuid  || echo "${USER}:100000:65536" >> /etc/subuid
	grep -q "^${USER}:" /etc/subgid  || echo "${USER}:100000:65536" >> /etc/subgid
	
	# Ensure ownership of .config
	chown -R casanode:casanode /opt/casanode/.config &>>"$LOGFILE"
	
	# Check rootless Docker prerequisites
	echo "  → Checking rootless prerequisites…" | tee -a "$LOGFILE"
	
	# Load nf_tables module as root (instead of sudo modprobe)
	if ! lsmod | grep -q '^nf_tables'; then
		echo "    • Loading nf_tables module as root…" | tee -a "$LOGFILE"
		modprobe nf_tables || {
			echo "      ✗ modprobe nf_tables failed" | tee -a "$LOGFILE"
			exit 1
		}
	fi

	# Install Docker rootless
	echo "  → Calling dockerd-rootless-setuptool.sh…" | tee -a "$LOGFILE"
	su - "$USER" -s /bin/bash -c \
		"PATH=/usr/local/sbin:/usr/sbin:/usr/local/bin:/usr/bin:/bin \
		XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR dockerd-rootless-setuptool.sh install -f" \
		2>&1 | tee "$LOGFILE_ROOTLESS"
	RC=${PIPESTATUS[0]}
	echo "→ install exit code = $RC" | tee -a "$LOGFILE"
	
	if [ $RC -eq 0 ]; then
		echo "  → Enabling rootless Docker service…" | tee -a "$LOGFILE"
		su - "$USER" -s /bin/bash -c \
			"XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR systemctl --user enable --now docker" \
			| tee -a "$LOGFILE"
		touch "$FLAGFILE"
		echo "  ✓ Docker rootless installation successful." | tee -a "$LOGFILE"
	else
		echo "✗ Rootless installation failed, will retry on next boot." | tee -a "$LOGFILE"
	fi
else
	echo "Docker rootless already installed." | tee -a "$LOGFILE"
	echo "  → Starting (or restarting) rootless Docker service…" | tee -a "$LOGFILE"
	su - "$USER" -s /bin/bash -c \
		"XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR systemctl --user restart docker" \
		| tee -a "$LOGFILE"
fi

# Check and apply necessary capabilities to node if needed
NODE_PATH=$(eval readlink -f "$(which node)")
if ! getcap "$NODE_PATH" | grep -q "cap_net_raw+eip"
then
	echo "Applying necessary capabilities to node..." | tee -a "$LOGFILE"
	setcap cap_net_raw+eip "$NODE_PATH" | tee -a "$LOGFILE"
	echo "Capabilities applied." | tee -a "$LOGFILE"
else
	echo "Necessary capabilities for node are already applied." | tee -a "$LOGFILE"
fi

# Configure UFW rules if not already configured
UFW_STATUS=$(ufw status | grep -i "Status: active")
if [ -z "$UFW_STATUS" ]
then
	# Load configuration file
	if [ -f "$CONFIGFILE" ]; then
		. "$CONFIGFILE"
	else
		echo "Configuration file $CONFIGFILE not found. Using default values." | tee -a "$LOGFILE"
		WEB_LISTEN="0.0.0.0:8080"
		API_LISTEN="0.0.0.0:8081"
	fi
	
	# Extract ports from configuration
	WEB_PORT=$(echo "$WEB_LISTEN" | cut -d':' -f2)
	API_PORT=$(echo "$API_LISTEN" | cut -d':' -f2)
	
	echo "Configuring UFW rules..." | tee -a "$LOGFILE"
	ufw default deny incoming | tee -a "$LOGFILE"
	ufw default allow outgoing | tee -a "$LOGFILE"
	ufw allow ssh | tee -a "$LOGFILE"
	ufw allow "$WEB_PORT" | tee -a "$LOGFILE"
	ufw allow "$API_PORT" | tee -a "$LOGFILE"
	ufw --force enable | tee -a "$LOGFILE"
	echo "UFW rules configured." | tee -a "$LOGFILE"
else
	echo "UFW is already active." | tee -a "$LOGFILE"
fi

# Unblock Bluetooth if necessary
if rfkill list bluetooth | grep -q "Soft blocked: yes"; then
	echo "  → Bluetooth is soft-blocked, unblocking…" | tee -a "$LOGFILE"
	rfkill unblock bluetooth \
		&& echo "    ✓ Bluetooth unblocked" | tee -a "$LOGFILE" \
		|| echo "    ✗ Failed to unblock Bluetooth" | tee -a "$LOGFILE"
else
	echo "  → Bluetooth is not soft-blocked, no need to unblock" | tee -a "$LOGFILE"
fi

echo "=== Casanode startup finished ===" | tee -a "$LOGFILE"
exit 0
