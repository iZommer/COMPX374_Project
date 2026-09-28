#!/usr/bin/env bash
set -euo pipefail

export DISPLAY="${DISPLAY:-:0}"

if command -v xset >/dev/null 2>&1; then
  xset s off
  xset s noblank
  xset -dpms
fi

if command -v unclutter >/dev/null 2>&1; then
  unclutter -idle 0.2 -root &
fi

CHROMIUM="$(command -v chromium || command -v chromium-browser)"
exec "$CHROMIUM" \
  --kiosk \
  --app=http://127.0.0.1:3000 \
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
  --no-first-run
