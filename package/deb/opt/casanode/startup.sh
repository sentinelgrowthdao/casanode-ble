#!/bin/bash

CONFIGFILE="/etc/casanode.conf"
LOGFILE="/var/log/casanode/startup.log"
USER="casanode"
FLAGFILE="/opt/$USER/.docker_rootless_installed"

# Clear the log file at the start of each execution
> "$LOGFILE"

# Check if Docker socket file exist
if [ ! -f "$FLAGFILE" ]
then
	echo "Docker rootless is not installed. Installing..." | tee -a "$LOGFILE"
	
	# Stop Docker rootful if it is running
	echo "Rootful Docker is running. Stopping Docker rootful..." | tee -a "$LOGFILE"
	systemctl disable --now docker.service docker.socket
	rm -f /var/run/docker.sock
	echo "Docker rootful stopped." | tee -a "$LOGFILE"
	
	# Enable linger for the user to allow the service to start at boot
	loginctl enable-linger "$USER"
	echo "Linger enabled for $USER user." | tee -a "$LOGFILE"
	
	# Add entries to /etc/subuid and /etc/subgid if they do not already exist
	if ! grep -q "^${USER}:" /etc/subuid
	then
		echo "${USER}:100000:65536" >> /etc/subuid
	fi
	if ! grep -q "^${USER}:" /etc/subgid
	then
		echo "${USER}:100000:65536" >> /etc/subgid
	fi
	
	# Install Docker rootless
	echo "Installing Docker rootless..." | tee -a "$LOGFILE"
	su -s /bin/bash -l "$USER" -c "export XDG_RUNTIME_DIR=/run/user/\$(id -u) && \
	export DBUS_SESSION_BUS_ADDRESS=unix:path=\$XDG_RUNTIME_DIR/bus && \
	dockerd-rootless-setuptool.sh install" | tee -a "$LOGFILE"
	echo "Docker rootless installation completed." | tee -a "$LOGFILE"
	
	# Create the necessary directories for Docker rootless
	su -s /bin/bash -l "$USER" -c "mkdir -p /opt/casanode/.config/systemd/user/docker.service.d && \
	cat > /opt/casanode/.config/systemd/user/docker.service.d/env.conf <<'EOT'
[Service]
Environment=XDG_RUNTIME_DIR=/run/user/%U
EOT"
	
	# Create the installation flag to avoid reinstalling on the next startup
	touch "$FLAGFILE"
else
	echo "Docker rootless is already installed." | tee -a "$LOGFILE"
fi

# Ensure that Docker rootless is started (check via systemctl --user)
if ! su -s /bin/bash -l "$USER" -c 'systemctl --user is-active docker' >/dev/null 2>&1
then
	echo "Starting Docker rootless for user $USER..." | tee -a "$LOGFILE"
	su -s /bin/bash -l "$USER" -c 'systemctl --user start docker'
else
	echo "Docker rootless is already running." | tee -a "$LOGFILE"
fi

# Check and apply necessary capabilities to node if needed
NODE_PATH=$(eval readlink -f $(which node))
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

exit 0
