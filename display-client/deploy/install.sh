#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo: sudo ./deploy/install.sh" >&2
  exit 1
fi

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KIOSK_USER="${SUDO_USER:-pi}"
INSTALL_DIR="/opt/where-is-nic"
DATA_DIR="/var/lib/where-is-nic"

apt-get update
apt-get install -y ca-certificates curl gnupg chromium unclutter x11-xserver-utils rsync

if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'process.versions.node.split(`.`)[0]')" -ne 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource-setup-20.sh
  bash /tmp/nodesource-setup-20.sh
  rm -f /tmp/nodesource-setup-20.sh
  apt-get install -y nodejs
fi

cd "$SOURCE_DIR"
npm ci
npm run build

id -u where-is-nic >/dev/null 2>&1 || useradd --system --home-dir "$DATA_DIR" --shell /usr/sbin/nologin where-is-nic
install -d -o where-is-nic -g where-is-nic -m 0750 "$DATA_DIR"
install -d -o root -g root -m 0755 "$INSTALL_DIR"
rsync -a --delete \
  --exclude node_modules --exclude .env --exclude data --exclude coverage \
  "$SOURCE_DIR/" "$INSTALL_DIR/"

cd "$INSTALL_DIR"
npm ci --omit=dev
chmod +x "$INSTALL_DIR/deploy/launch-kiosk.sh"
install -m 0644 "$INSTALL_DIR/deploy/where-is-nic.service" /etc/systemd/system/where-is-nic.service
sed "s/@KIOSK_USER@/${KIOSK_USER}/g" "$INSTALL_DIR/deploy/where-is-nic-kiosk.service" > /etc/systemd/system/where-is-nic-kiosk.service

if [[ ! -f /etc/where-is-nic.env ]]; then
  install -m 0600 "$INSTALL_DIR/.env.example" /etc/where-is-nic.env
fi

systemctl daemon-reload
systemctl enable --now where-is-nic.service
systemctl enable where-is-nic-kiosk.service

echo "Installed. Edit /etc/where-is-nic.env if needed, then reboot to start the kiosk."
