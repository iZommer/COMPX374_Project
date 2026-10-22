#!/usr/bin/env bash
# Purpose: Waits for the local display service and launches Chromium in kiosk mode.
set -Eeuo pipefail

log() { printf '[where-is-nic-kiosk] %s\n' "$*" >&2; }

if [[ -z "${DISPLAY:-}" && -z "${WAYLAND_DISPLAY:-}" ]]; then
  log "no graphical session variables are available; start this from the desktop autostart entry"
  exit 1
fi

CHROMIUM="$(command -v chromium || command -v chromium-browser || true)"
[[ -n "$CHROMIUM" ]] || { log "Chromium is not installed"; exit 1; }
[[ -n "${HOME:-}" && -d "$HOME" ]] || { log "the desktop session has no valid home directory"; exit 1; }

CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
PROFILE_DIR="$CONFIG_HOME/where-is-nic-chromium"
mkdir -p "$PROFILE_DIR"

# This script runs inside the logged-in desktop session, so Chromium inherits
# the correct X11 or Wayland connection and authentication from the session.
# Wait for the local server before opening its page, including on slow boots.
wait_count=0
until curl --silent --show-error --fail --max-time 3 http://127.0.0.1:3000/local/state >/dev/null 2>&1; do
  wait_count=$((wait_count + 1))
  if (( wait_count % 15 == 1 )); then
    log "waiting for the local display server at http://127.0.0.1:3000"
  fi
  sleep 2
done

while true; do
  log "starting Chromium kiosk"
  "$CHROMIUM" \
    --kiosk \
    --app=http://127.0.0.1:3000 \
    --user-data-dir="$PROFILE_DIR" \
    --noerrdialogs \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-translate \
    --disable-features=TranslateUI,TouchpadOverscrollHistoryNavigation \
    --disable-pinch \
    --overscroll-history-navigation=0 \
    --check-for-update-interval=31536000 \
    --autoplay-policy=no-user-gesture-required \
    --password-store=basic \
    --no-first-run || true
  log "Chromium exited; restarting in 5 seconds"
  sleep 5
done
