#!/bin/bash

echo "#############################################"
echo "Script used to install the necessary dependencies for the project"
echo "#############################################"

# Install the necessary dependencies
echo "Installing the necessary dependencies"
sudo apt update && sudo apt upgrade -y
sudo sudo apt install build-essential -y

# Install Node.js
echo "Installing Node.js"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
sudo apt install bluetooth bluez libbluetooth-dev libudev-dev libcap2-bin

# Make log directory
echo "Creating log directory"
sudo mkdir -p /var/log/casanode
sudo chown -R $USER: /var/log/casanode

# Make casanode config file
echo "Creating casanode config file"
sudo touch "/etc/casanode.conf"
sudo sudo chown -R $USER: /etc/casanode.conf
