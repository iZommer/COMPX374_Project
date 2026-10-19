# Digital Office Display

Raspberry Pi kiosk client for [Kei Hea a Nic? — Where is Nic?](../README.md). The web application and its API live at the repository root. This client reads the web app's `/api/display/<key>/latest` endpoint and never changes server data.

## Requirements

- Raspberry Pi 3 or newer (Pi 4 or 5 recommended)
- Raspberry Pi OS Bookworm Desktop, 32-bit or 64-bit
- Chromium and a graphical desktop session
- Touchscreen, 800×480 or larger
- Network access to the deployed Diary Server
- Node.js 20 LTS (the installer installs it if needed)

The responsive interface targets 800×480, 1024×600, 1280×720, and 1920×1080, in both orientations. Check the actual screen and browser scaling before mounting the display.

## Local development

From the repository root:

```sh
cd display-client
npm ci
npm run dev
```

The Vite interface is at `http://127.0.0.1:5173`; it proxies local API calls to the Express server on port 3000. To use the simulator instead of a deployed web app, start `npm run mock` in another terminal, then pair the client with `http://127.0.0.1:4100` and key `test-key`. HTTP is accepted only for loopback development.

## Configuration and pairing

The Pi configuration example is stored at [`../env_examples/display_client_env_example.txt`](../env_examples/display_client_env_example.txt). For local development, copy it into `display-client/.env`. For a system installation, the installer creates `/etc/where-is-nic.env` from this example; edit that file as root if you need to set defaults. Leave `DISPLAY_API_KEY` empty to pair on the screen. The application removes a trailing slash from `DIARY_SERVER_URL` automatically.

Configuration variables set defaults for the server URL, display key, polling and timeout, data directory, timezone, idle return, stale-data warning, pixel shifting, and overnight dimming. Pairing and preferences saved by the application take precedence over environment defaults. The stored key and cached data live under `DATA_DIR`; do not share or commit them.

To pair:

1. Deploy the web application as described in the [root README](../README.md).
2. In its dashboard, open the Display page and copy the display key.
3. On first boot, enter the deployed HTTPS server URL and key with the Pi's physical keyboard, then choose **Validate and pair**. The client validates the key before saving it.

The server must be reachable from the Pi, and Vercel Deployment Protection must allow the key-authenticated production display endpoint to return JSON without a Vercel login. Display preferences set in the web app are applied at the next successful poll; local preferences serve as defaults and fallback settings.

To open the hidden settings panel, press and hold the top-left corner for five seconds. It includes text size, contrast, pixel shifting, idle return, and re-pairing. Re-pairing removes the saved key and returns to setup.

## Install on Raspberry Pi

Clone the repository on the Pi, enter `display-client`, and run:

```sh
sudo bash ./deploy/install.sh
```

The installer builds the client, installs it under `/opt/where-is-nic`, creates the `where-is-nic` service account and `/var/lib/where-is-nic` data directory, installs systemd units, and enables the server service. It enables the kiosk service; reboot to start it in the desktop session.

```sh
sudo nano /etc/where-is-nic.env
sudo reboot
```

The kiosk service uses the account that invoked `sudo`. If the desktop belongs to a different account, update `User` and `XAUTHORITY` in `/etc/systemd/system/where-is-nic-kiosk.service`, then run `sudo systemctl daemon-reload` and enable the kiosk service again.

Useful commands:

```sh
systemctl status where-is-nic
journalctl -u where-is-nic -f
systemctl status where-is-nic-kiosk
curl http://127.0.0.1:3000/local/state
```

To update, pull the repository and rerun the installer:

```sh
git pull
cd display-client
sudo bash ./deploy/install.sh
sudo systemctl restart where-is-nic where-is-nic-kiosk
```

The installer preserves `/etc/where-is-nic.env` and data under `/var/lib/where-is-nic`.

## Network outages and time

The client polls the Diary Server (10 seconds by default, at most every 15 seconds), validates the response, and atomically saves the last successful payload. During outages it continues showing cached data with an out-of-date warning; older data gets a stronger warning. A cold offline boot uses the cache if available. Without a cache, the display shows a waiting state. It refreshes automatically when the connection returns.

Times use the configured IANA timezone, defaulting to `Pacific/Auckland`, including daylight-saving transitions. Keep network time enabled on the Pi:

```sh
timedatectl status
sudo timedatectl set-ntp true
```

## Troubleshooting

- **No network or stale data:** Check Wi-Fi/Ethernet and DNS, then request the Diary Server URL from the Pi. A Vercel HTML login page indicates Deployment Protection is intercepting the endpoint.
- **Wrong time:** Check `timedatectl`, enable NTP, and verify `TIMEZONE`. A Pi without a real-time clock may have an incorrect time before network time syncs.
- **Blank screen:** Check both systemd services and their logs. Confirm `curl http://127.0.0.1:3000/local/state` returns JSON and Chromium can open the local page. The build should have produced `dist/index.html`.
- **Touchscreen calibration:** Start with Raspberry Pi OS Screen Configuration. For X11 panels, inspect `xinput list` and use the panel manufacturer's calibration details. Verify rotation in the desktop and Chromium.

## Build and tests

```sh
npm test
npm run build
npm start
```

The production Express server binds to `127.0.0.1:3000`. Tests cover payload validation, polling/backoff, cache recovery, contact QR data, calendar rendering, and time-zone behavior. The kiosk polls the remote service; Chromium receives updates from the local server over Server-Sent Events and never receives the saved API key.
