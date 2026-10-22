# Digital Office Display

Raspberry Pi kiosk client for [Kei Hea a Nic? — Where is Nic?](../README.md). The web application and its API live at the repository root. This client reads the web app's `/api/display/<key>/latest` endpoint and never changes server data.

## Requirements

- Raspberry Pi 3 or newer (Pi 4 or 5 recommended)
- Raspberry Pi OS Bookworm Desktop, 32-bit or 64-bit
- Chromium and a graphical desktop session
- Touchscreen, 800×480 or larger
- Network access to the deployed Diary Server
- Node.js 20 or 22 (the installer installs Node.js 22 if the installed version is unsupported)

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

The Pi configuration example is stored at [`../env_examples/display_client_env_example.txt`](../env_examples/display_client_env_example.txt). For local development, copy it into `display-client/.env` and edit the values. A system installation creates `/etc/where-is-nic.env` with `DATA_DIR=/var/lib/where-is-nic`; the installer preserves existing settings and data on updates. When run in a terminal, it offers to collect the Diary Server URL and display key. Leave either blank to enter it during first screen setup. The application removes a trailing slash from `DIARY_SERVER_URL` automatically.

Configuration variables set defaults for the server URL, display key, polling and timeout, data directory, timezone, idle return, stale-data warning, pixel shifting, and overnight dimming. Pairing and preferences saved by the application take precedence over environment defaults. The stored key and cached data live under `DATA_DIR`; do not share or commit them.

| Variable | Default | Meaning |
| --- | --- | --- |
| `DIARY_SERVER_URL` | Empty | Deployed Diary Server base URL. HTTPS is required except for loopback development. |
| `DISPLAY_API_KEY` | Empty | Optional initial pairing key. A saved on-device pairing takes precedence. |
| `POLL_INTERVAL_SECONDS` | `10` | Successful poll interval, clamped to 1–15 seconds. Failed polls use backoff up to 30 seconds. |
| `REQUEST_TIMEOUT_MS` | `8000` | Per-request timeout, clamped to 1,000–30,000 ms. |
| `PORT` | `3000` | Local Express server port (1024–65535). |
| `DATA_DIR` | `./data` | Directory for saved pairing, settings, and cached payload; relative paths resolve from the server working directory. The installer sets `/var/lib/where-is-nic`. |
| `TIMEZONE` | `Pacific/Auckland` | IANA timezone used for display dates and times. |
| `IDLE_RETURN_SECONDS` | `60` | Inactivity timeout before returning to Status (10–3,600 seconds). |
| `STALE_AFTER_HOURS` | `24` | Age after which cached data receives a stronger stale warning (1–720 hours). |
| `PIXEL_SHIFT_ENABLED` | `true` | Set to `false` to disable the periodic display shift. |
| `DIM_START_HOUR`, `DIM_END_HOUR` | `19`, `7` | Local-hour dimming window, each from 0 to 23. Empty or unset values use these defaults. |
| `DIM_LEVEL` | `55` | Brightness multiplier percentage for the dimming window (10–100). |

To pair:

1. Deploy the web application as described in the [root README](../README.md).
2. In its dashboard, open the Display page and copy the display key.
3. If the installer did not receive the URL and key, enter them in the setup form with a keyboard connected to the Pi, then choose **Validate and pair**. The client validates the key before saving it. No file editing over SSH is needed.

The server must be reachable from the Pi, and Vercel Deployment Protection must allow the key-authenticated production display endpoint to return JSON without a Vercel login. Display preferences set in the web app are applied at the next successful poll; local preferences serve as defaults and fallback settings.

To open the hidden settings panel, press and hold the top-left corner for five seconds. It includes text size, contrast, pixel shifting, idle return, and re-pairing. Re-pairing removes the saved key and returns to setup.

## Install on Raspberry Pi

Clone the repository on the Pi, enter `display-client`, and run once:

```sh
sudo bash ./deploy/install.sh
```

The installer installs Node.js and Chromium if needed, builds the production client under `/opt/where-is-nic`, creates its service account and persistent data directory, and enables the local server. It configures Raspberry Pi OS to boot into the desktop with automatic login for the account that ran `sudo`, disables display blanking, then adds the kiosk launcher to that user's desktop autostart. The launcher inherits the desktop's actual X11 or Wayland session, waits for the local server, and restarts Chromium if it exits. If the installer is run interactively, it asks for the Diary Server URL and display key; either can be left blank for touch-screen pairing.

```sh
sudo reboot
```

After reboot, the kiosk opens automatically. If pairing is still needed, the screen displays the setup form; enter the HTTPS Diary Server URL and the display key using a keyboard connected to the Pi, then select **Validate and pair**. The saved pairing and schedule cache survive reboots in `/var/lib/where-is-nic`.

Useful commands:

```sh
systemctl status where-is-nic
journalctl -u where-is-nic -f
curl http://127.0.0.1:3000/local/state
```

To update, pull the repository and rerun the installer:

```sh
git pull
cd display-client
sudo bash ./deploy/install.sh
sudo systemctl restart where-is-nic
sudo reboot
```

The installer preserves `/etc/where-is-nic.env`, user settings, and data under `/var/lib/where-is-nic`. The only required manual interaction after a blank-key install is pairing on the Pi's screen.

## Network outages and time

The client polls the Diary Server (10 seconds by default, with a configured interval of at most 15 seconds), validates the response, and atomically saves the last successful payload. After repeated failures, retries back off to 30 seconds. The browser receives local state changes over Server-Sent Events; the web app does not push changes directly to the Pi. During outages the client continues showing cached data with an out-of-date warning; older data gets a stronger warning. A cold offline boot uses the cache if available. Without a cache, the display shows a waiting state. It refreshes automatically when the connection returns.

Times use the configured IANA timezone, defaulting to `Pacific/Auckland`, including daylight-saving transitions. Keep network time enabled on the Pi:

```sh
timedatectl status
sudo timedatectl set-ntp true
```

## Troubleshooting

- **No network or stale data:** Check Wi-Fi/Ethernet and DNS, then request the Diary Server URL from the Pi. A Vercel HTML login page indicates Deployment Protection is intercepting the endpoint.
- **Wrong time:** Check `timedatectl`, enable NTP, and verify `TIMEZONE`. A Pi without a real-time clock may have an incorrect time before network time syncs.
- **Blank screen:** Check `systemctl status where-is-nic` and `journalctl -u where-is-nic`. Confirm `curl http://127.0.0.1:3000/local/state` returns JSON, Raspberry Pi OS is set to desktop autologin, and `.config/autostart/where-is-nic.desktop` exists in the desktop user's home directory. Check that Chromium is running with `pgrep -af chromium`; the production build should contain `dist/index.html`.
- **Touchscreen calibration:** Start with Raspberry Pi OS Screen Configuration. For X11 panels, inspect `xinput list` and use the panel manufacturer's calibration details. Verify rotation in the desktop and Chromium.

## Build and tests

```sh
npm test
npm run build
npm start
```

The production Express server binds to `127.0.0.1` on `PORT` (3000 by default). Tests cover payload validation, polling and backoff, cache recovery, contact-card data, calendar event layout, settings, staleness, and time-zone behavior. The kiosk polls the remote service; Chromium receives updates from the local server over Server-Sent Events and never receives the saved API key.
