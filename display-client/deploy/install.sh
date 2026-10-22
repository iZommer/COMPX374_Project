#!/usr/bin/env bash
# Purpose: Installs the display service, kiosk launcher, and boot-time systemd configuration.
set -Eeuo pipefail

readonly INSTALL_DIR="/opt/where-is-nic"
readonly DATA_DIR="/var/lib/where-is-nic"
readonly ENV_FILE="/etc/where-is-nic.env"
readonly SERVER_UNIT="/etc/systemd/system/where-is-nic.service"
readonly LEGACY_KIOSK_UNIT="/etc/systemd/system/where-is-nic-kiosk.service"

fail() { echo "Install failed: $*" >&2; exit 1; }
trap 'status=$?; echo "Install failed at line ${BASH_LINENO[0]} (exit ${status})." >&2; exit "$status"' ERR

[[ ${EUID} -eq 0 ]] || fail "run from display-client with: sudo bash ./deploy/install.sh"

SOURCE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
[[ -f "$SOURCE_DIR/package-lock.json" && -f "$SOURCE_DIR/package.json" ]] || fail "could not locate the display-client project at $SOURCE_DIR"
[[ -f /etc/os-release ]] || fail "this installer requires Raspberry Pi OS (Bookworm or newer)"
# shellcheck disable=SC1091
source /etc/os-release
[[ "${ID:-}" == "raspbian" || "${ID:-}" == "debian" || "${ID_LIKE:-}" == *debian* ]] || fail "supported platform is Raspberry Pi OS / Debian"

if [[ -n "${SUDO_USER:-}" && "$SUDO_USER" != root ]] && getent passwd "$SUDO_USER" >/dev/null; then
  KIOSK_USER="$SUDO_USER"
else
  KIOSK_USER="$(getent passwd | awk -F: '$3 >= 1000 && $3 < 60000 && $7 !~ /nologin|false/ { print $1; exit }')"
fi
[[ -n "${KIOSK_USER:-}" ]] || fail "no desktop login user found; create the Pi desktop user, then rerun this installer"
KIOSK_HOME="$(getent passwd "$KIOSK_USER" | cut -d: -f6)"
[[ -n "$KIOSK_HOME" && -d "$KIOSK_HOME" ]] || fail "home directory for $KIOSK_USER is missing"

echo "Installing for desktop user: $KIOSK_USER"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg chromium raspi-config rsync

node_major=""
if command -v node >/dev/null 2>&1; then
  node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
fi
if [[ "$node_major" != 20 && "$node_major" != 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/where-is-nic-nodesource-setup.sh
  bash /tmp/where-is-nic-nodesource-setup.sh
  rm -f /tmp/where-is-nic-nodesource-setup.sh
  apt-get install -y nodejs
fi
node_major="$(node -p 'Number(process.versions.node.split(".")[0])')"
[[ "$node_major" == 20 || "$node_major" == 22 ]] || fail "Node.js 20 or 22 is required; found $(node --version)"

# Keep existing pairing and preferences; only seed defaults on first install.
if [[ ! -e "$ENV_FILE" ]]; then
  install -o root -g root -m 0600 /dev/null "$ENV_FILE"
  cat > "$ENV_FILE" <<EOF
# Defaults for the Where Is Nic display. Pairing on the screen works when the key is blank.
DIARY_SERVER_URL=
DISPLAY_API_KEY=
POLL_INTERVAL_SECONDS=10
REQUEST_TIMEOUT_MS=8000
PORT=3000
DATA_DIR=$DATA_DIR
TIMEZONE=Pacific/Auckland
IDLE_RETURN_SECONDS=60
STALE_AFTER_HOURS=24
PIXEL_SHIFT_ENABLED=true
DIM_START_HOUR=22
DIM_END_HOUR=7
EOF
fi
chmod 0600 "$ENV_FILE"

# The fixed state directory is writable under the service's systemd sandbox.
if ! grep -qE '^[[:space:]]*DATA_DIR=' "$ENV_FILE"; then
  printf '\nDATA_DIR=%s\n' "$DATA_DIR" >> "$ENV_FILE"
elif ! grep -qE "^[[:space:]]*DATA_DIR=[\"']?${DATA_DIR}[\"']?[[:space:]]*(#.*)?$" "$ENV_FILE"; then
  echo "Updating DATA_DIR in $ENV_FILE to the persistent service directory $DATA_DIR."
  sed -i -E "s|^[[:space:]]*DATA_DIR=.*$|DATA_DIR=$DATA_DIR|" "$ENV_FILE"
fi

read_env_value() {
  local key="$1" line value
  line="$(grep -m1 -E "^[[:space:]]*${key}=" "$ENV_FILE" || true)"
  value="${line#*=}"
  value="${value%$'\r'}"
  value="${value#\"}"; value="${value%\"}"
  value="${value#\'}"; value="${value%\'}"
  printf '%s' "$value"
}

diary_url="$(read_env_value DIARY_SERVER_URL)"
api_key="$(read_env_value DISPLAY_API_KEY)"
if [[ "$diary_url" == *YOUR_PROJECT* ]]; then
  sed -i -E 's|^[[:space:]]*DIARY_SERVER_URL=.*$|DIARY_SERVER_URL=|' "$ENV_FILE"
  diary_url=""
fi
if [[ -t 0 ]]; then
  if [[ -z "$diary_url" || "$diary_url" == *YOUR_PROJECT* ]]; then
    read -r -p "Diary Server URL (https://…; leave blank to enter on the display): " entered_url
    if [[ -n "$entered_url" ]]; then
      [[ "$entered_url" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?(/[A-Za-z0-9._~:/@\!\$\&\'\(\)\*+,;=%-]*)?$ || "$entered_url" =~ ^http://(127\.0\.0\.1|localhost)(:[0-9]+)?(/[A-Za-z0-9._~:/@\!\$\&\'\(\)\*+,;=%-]*)?$ ]] || fail "enter an HTTPS URL (HTTP is allowed only for localhost)"
      escaped_url="${entered_url//\\/\\\\}"
      escaped_url="${escaped_url//&/\\&}"
      escaped_url="${escaped_url//|/\\|}"
      sed -i -E "s|^[[:space:]]*DIARY_SERVER_URL=.*$|DIARY_SERVER_URL=\"$escaped_url\"|" "$ENV_FILE"
      diary_url="$entered_url"
    fi
  fi
  if [[ -z "$api_key" ]]; then
    read -r -s -p "Display API key (leave blank to pair on the display): " entered_key
    echo
    if [[ -n "$entered_key" ]]; then
      [[ "$entered_key" =~ ^[A-Za-z0-9._~-]+$ ]] || fail "the display API key contains unsupported characters"
      if grep -qE '^[[:space:]]*DISPLAY_API_KEY=' "$ENV_FILE"; then
        sed -i -E "s|^[[:space:]]*DISPLAY_API_KEY=.*$|DISPLAY_API_KEY=$entered_key|" "$ENV_FILE"
      else
        printf 'DISPLAY_API_KEY=%s\n' "$entered_key" >> "$ENV_FILE"
      fi
    fi
  fi
fi

if ! id where-is-nic >/dev/null 2>&1; then
  useradd --system --home-dir "$DATA_DIR" --shell /usr/sbin/nologin where-is-nic
fi
install -d -o root -g root -m 0755 "$INSTALL_DIR"
install -d -o where-is-nic -g where-is-nic -m 0750 "$DATA_DIR"
chown where-is-nic:where-is-nic "$DATA_DIR"

if [[ -d "$INSTALL_DIR/data" && "$INSTALL_DIR/data" != "$DATA_DIR" ]]; then
  install -d -o where-is-nic -g where-is-nic -m 0750 "$DATA_DIR"
  cp -an "$INSTALL_DIR/data/." "$DATA_DIR/"
  chown -R where-is-nic:where-is-nic "$DATA_DIR"
fi

# Never delete unknown files from the install directory. Build in place so the
# generated production bundle matches the installed Node dependencies.
rsync -a \
  --exclude node_modules --exclude .env --exclude data --exclude coverage \
  --exclude dist-node --exclude dist \
  "$SOURCE_DIR/" "$INSTALL_DIR/"
chown -R root:root "$INSTALL_DIR"
chmod 0755 "$INSTALL_DIR/deploy/launch-kiosk.sh"
cd "$INSTALL_DIR"
npm ci --no-audit --no-fund
npm run build
npm prune --omit=dev --no-audit --no-fund
[[ -f "$INSTALL_DIR/dist/index.html" && -f "$INSTALL_DIR/dist-node/server/index.js" ]] || fail "production build output is missing"

install -o root -g root -m 0644 "$INSTALL_DIR/deploy/where-is-nic.service" "$SERVER_UNIT"

# Older installs used a system kiosk service with a hard-coded X11 display and
# Xauthority path. Move kiosk startup into the real desktop login session.
if [[ -f "$LEGACY_KIOSK_UNIT" ]] && grep -q 'Where Is Nic Chromium Kiosk' "$LEGACY_KIOSK_UNIT"; then
  systemctl disable --now where-is-nic-kiosk.service >/dev/null 2>&1 || true
  rm -f "$LEGACY_KIOSK_UNIT"
fi

AUTOSTART_DIR="$KIOSK_HOME/.config/autostart"
AUTOSTART_FILE="$AUTOSTART_DIR/where-is-nic.desktop"
install -d -o "$KIOSK_USER" -g "$(id -gn "$KIOSK_USER")" -m 0755 "$AUTOSTART_DIR"
if [[ -e "$AUTOSTART_FILE" ]] && ! grep -q 'Exec=/opt/where-is-nic/deploy/launch-kiosk.sh' "$AUTOSTART_FILE"; then
  fail "$AUTOSTART_FILE already exists and is not managed by this installer; move it aside and rerun"
fi
if [[ ! -e "$AUTOSTART_FILE" ]]; then
  cat > "$AUTOSTART_FILE" <<EOF
[Desktop Entry]
Type=Application
Name=Where Is Nic Display
Comment=Launch the Where Is Nic status display in kiosk mode
Exec=$INSTALL_DIR/deploy/launch-kiosk.sh
Terminal=false
X-GNOME-Autostart-enabled=true
EOF
  chown "$KIOSK_USER:$(id -gn "$KIOSK_USER")" "$AUTOSTART_FILE"
  chmod 0644 "$AUTOSTART_FILE"
fi

# Raspberry Pi OS supports selecting the graphical desktop with automatic
# login through raspi-config. The kiosk needs a real desktop session so it gets
# the correct X11 or Wayland environment without hard-coded display variables.
raspi-config nonint do_boot_behaviour B4
raspi-config nonint do_blanking 1
systemctl set-default graphical.target
systemctl daemon-reload
systemctl enable --now where-is-nic.service

echo
echo "Installation complete for $KIOSK_USER."
if [[ -z "$(read_env_value DIARY_SERVER_URL)" || -z "$(read_env_value DISPLAY_API_KEY)" ]]; then
  echo "On first boot, enter the Diary Server URL and display key on the touchscreen to pair."
else
  echo "The display will connect using the supplied Diary Server configuration on first boot."
fi
echo "Reboot now with: sudo reboot"
