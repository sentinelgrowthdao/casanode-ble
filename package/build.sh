#!/bin/bash
set -e

# Directories used
DEB_DIR="/package/deb"					# Files intended for the .deb
DIST_DIR="/package/dist"				# Where the generated .deb will be placed
APP_DIR="/app/"							# Node.js sources in TypeScript
TARGET_APP_DIR="$DEB_DIR/opt/casanode"	# Destination of the compiled application in the .deb

echo "=== Cleaning previous compiled application files in $TARGET_APP_DIR ==="
find "$TARGET_APP_DIR" -mindepth 1 ! -name 'startup.sh' -delete

echo "=== Creating log directory $DEB_DIR/var/log/casanode if it does not exist ==="
mkdir -p "$DEB_DIR/var/log/casanode"

echo "=== Building Node.js application in $APP_DIR ==="
cd "$APP_DIR"
npm install
npm run build

echo "=== Copying compiled application files from $APP_DIR/dist to $TARGET_APP_DIR ==="
cp -r "$APP_DIR/dist/"* "$TARGET_APP_DIR/"

cd "$PROJECT_ROOT"

echo "=== Setting permissions on package files ==="
# DEBIAN scripts must be executable
chmod 755 "$DEB_DIR/DEBIAN/postinst"
chmod 755 "$DEB_DIR/DEBIAN/prerm"
chmod 755 "$DEB_DIR/DEBIAN/postrm"
# For example, the systemd file and config must be read-only
chmod 644 "$DEB_DIR/etc/systemd/system/casanode.service"
chmod 644 "$DEB_DIR/etc/systemd/system/casanode-startup.service"
chmod 644 "$DEB_DIR/etc/casanode.conf"
chmod 644 "$DEB_DIR/etc/logrotate.d/casanode"
# Ensure the startup.sh script is executable
chmod +x "$TARGET_APP_DIR/startup.sh"

# Change the owner of all package files to comply with Debian standards
chown -R root:root "$DEB_DIR"

# Variables for package creation
PACKAGE_NAME="casanode"
VERSION="1.0.0"
ARCHITECTURE="all"  # Since the project is in Node.js, we can use "all"
DEB_FILE="$DIST_DIR/${PACKAGE_NAME}_${VERSION}_${ARCHITECTURE}.deb"

mkdir -p "$DIST_DIR"
echo "=== Building .deb package ==="
dpkg-deb --build --root-owner-group "$DEB_DIR" "$DEB_FILE"

echo -e "\e[32mPackage built successfully: $DEB_FILE\e[0m"
