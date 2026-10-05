# Digital Office Display

The Raspberry Pi display client for **Kei Hea a Nic? Where is Nic?** It is deliberately isolated from the Academic Web Application and Diary Server in the parent repository. The display reads the existing `/api/display/{apiKey}/latest` endpoint and never writes to the Diary Server.

## Architecture

The Node 20/Express process binds only to `127.0.0.1`. It polls the Diary Server over HTTPS, validates the response, writes the last good response atomically to disk, and pushes changed state to Chromium with Server-Sent Events. Chromium never receives the saved API key and only communicates with localhost.

```text
Diary Server ◄── HTTPS GET ── Express poller ── atomic config/cache JSON
                                      │
                                      └── local JSON API + SSE ── Chromium kiosk
```

The frontend is Vite with vanilla TypeScript and plain CSS. All three visitor views remain mounted, so switching is immediate. QR codes are generated locally from vCard 3.0 data and require no internet connection.

## Hardware and OS

- Raspberry Pi 3 or newer; Pi 4/5 recommended
- Raspberry Pi OS Bookworm Desktop, 32-bit or 64-bit
- Touchscreen at 800×480 or greater
- Network access to the production Diary Server
- Node.js 20 LTS (the installer adds it when necessary)
- Chromium and a graphical desktop session

The responsive layout targets 800×480, 1024×600, 1280×720, and 1920×1080 in landscape and portrait. Test the exact panel and browser scaling before mounting it.

## Local development

```bash
cd display-client
cp .env.example .env
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Vite proxies `/local/*` to Express on port 3000.

To develop without the deployed server, start the mock in a second terminal:

```bash
npm run mock
```

Pair with `http://127.0.0.1:4100` and key `test-key`. Plain HTTP is accepted only for loopback development. Simulator controls include:

```bash
curl -X POST http://127.0.0.1:4100/mock/status/IN_A_MEETING
curl -X POST http://127.0.0.1:4100/mock/mode/empty-calendar
curl -X POST http://127.0.0.1:4100/mock/mode/no-contact
curl -X POST http://127.0.0.1:4100/mock/mode/slow
curl -X POST http://127.0.0.1:4100/mock/mode/error
```

Use a key other than `test-key` to simulate a 404/revoked key. Return to normal with `POST /mock/mode/normal`.

## Configuration and pairing

Copy `.env.example` to `.env` for development or edit `/etc/where-is-nic.env` on the Pi. Never commit a real display key. Environment values provide defaults. Values entered during setup are stored in `DATA_DIR/config.json`.

Obtain the API key from the Academic Web Application at `/dashboard/display`. On first boot:

1. Enter the production Diary Server base URL without a trailing slash.
2. Enter the academic's display API key using the Pi's physical keyboard.
3. Tap **Validate and pair**. The server performs a real request before saving anything.

The production URL must be publicly reachable by the Pi. Disable Vercel Deployment Protection for the production route or configure the production deployment so an unauthenticated GET returns JSON rather than a login page.

To open protected settings, press and hold the invisible top-left corner for five seconds. This panel controls text size, high contrast, pixel shifting, idle return, and re-pairing. Re-pairing removes the stored key and returns to setup. The local reset route is bound to loopback and is not reachable from another device.

Display preferences saved in the Academic Web Application win over environment and hidden-menu values. The Pi applies server changes on its next successful poll (normally within 10 seconds). The local menu remains a fallback when the server payload has no settings; local changes are retained on the Pi but are overridden when server preferences arrive. This keeps local control available during setup while making the server the source of truth for paired displays.

## Build and test

```bash
npm test
npm run build
npm start
```

The production server is at `http://127.0.0.1:3000`. Tests cover payload validation, polling/non-overlap/backoff, atomic cache behavior and corrupt recovery, vCards, overlapping and overnight calendar events, the NZ DST transition, and staleness severity.

For bundle size, inspect the summary from `npm run build`; the application target is below 300 KB gzip excluding fonts. The client owns one clock interval, one pixel-shift interval, one idle timer, and one SSE connection. SSE listeners and server keepalive timers are released on disconnect; the poller schedules its next timer only after the current request completes. This prevents timer, request, and connection growth during long-running operation.

## Raspberry Pi installation

Clone the repository on the Pi, enter this directory, and run:

```bash
sudo bash ./deploy/install.sh
```

The installer builds into `/opt/where-is-nic`, creates the restricted `where-is-nic` service user, creates `/var/lib/where-is-nic`, installs the two systemd units, and enables the server. Review `/etc/where-is-nic.env`, then reboot:

```bash
sudo nano /etc/where-is-nic.env
sudo reboot
```

The kiosk service uses the user who invoked `sudo`. If the graphical desktop belongs to another account, replace `User` and `XAUTHORITY` in `/etc/systemd/system/where-is-nic-kiosk.service`, run `sudo systemctl daemon-reload`, and enable it again.

Useful commands:

```bash
systemctl status where-is-nic
journalctl -u where-is-nic -f
systemctl status where-is-nic-kiosk
curl http://127.0.0.1:3000/local/state
```

### Updating

```bash
git pull
cd display-client
sudo bash ./deploy/install.sh
sudo systemctl restart where-is-nic where-is-nic-kiosk
```

The installer preserves `/etc/where-is-nic.env` and data under `/var/lib/where-is-nic`.

## Offline and time behavior

Every valid response is written with `lastSuccessAt`. During an outage the display immediately keeps the cached information and shows a calm out-of-date banner. Data older than `STALE_AFTER_HOURS` gets a stronger warning. A cold offline boot renders cache before retrying; without cache it displays “Waiting for connection…”. Success clears the warning without a reload.

Times use `TIMEZONE` (`Pacific/Auckland` by default), including daylight-saving transitions. If the Pi clock reports a year before 2024, a warning is shown and the calendar avoids claiming that its current-time indication is reliable. Keep system time enabled:

```bash
timedatectl status
sudo timedatectl set-ntp true
```

## Troubleshooting

### No network

Confirm Wi-Fi/Ethernet and DNS, then `curl` the Diary Server endpoint from the Pi. Cached data should remain visible. A Vercel HTML login response means Deployment Protection is intercepting the endpoint.

### Wrong time

Run `timedatectl`, enable NTP, and verify `TIMEZONE`. Raspberry Pis without a real-time clock can briefly have a wrong clock before networking synchronizes it.

### Blank screen

Check both services and `journalctl`. Confirm `curl http://127.0.0.1:3000/local/state` returns JSON and Chromium can open that address. Verify the build produced `dist/index.html`.

### Touchscreen calibration

Use Raspberry Pi OS Screen Configuration first. For X11 panels, inspect `xinput list` and apply the vendor's calibration matrix. Re-test rotation in both desktop and Chromium; avoid hard-coding pixel coordinates in the app.

## Manual acceptance checklist

- [ ] First boot without a stored key opens pairing and accepts input from the Pi's physical keyboard.
- [ ] A bad/revoked key shows a specific message and is not saved.
- [ ] Unplug the network: the banner appears while last-good data remains on all views.
- [ ] Reconnect the network: the banner clears automatically within one successful retry.
- [ ] Change status in the web app: the door display changes within 15 seconds during normal connectivity.
- [ ] Reboot the Pi: it boots directly to Current Status without interaction.
- [ ] Leave Calendar or Contact idle for 60 seconds: it returns to Current Status.
- [ ] Swipe and tab navigation switch instantly, with 48 px minimum touch targets.
- [ ] Empty calendar, overlaps, overnight events, no contact, and QR scanning behave correctly.
- [ ] Hold the top-left corner for five seconds: settings opens; a casual tap does nothing.
- [ ] Check 800×480, 1024×600, 1280×720, and 1920×1080 in landscape and portrait.
- [ ] Verify high contrast, all text sizes, reduced motion, keyboard focus, and screen-reader labels.
- [ ] Leave running for 72 hours and confirm stable process memory, one SSE connection, and no growing timers/listeners.

## Requirements traceability

| Requirement | Implementation | SRS §4 / NFR addressed |
|---|---|---|
| FR-09 client side | Read-only validated `/api/display/{apiKey}/latest` polling | Security, interoperability, reliability |
| FR-10 Current Status | Large labelled status, distinct symbol/shape and colour-safe palette, return time/message | 4.1 performance, 4.8 accessibility |
| FR-11 Weekly Calendar | Monday–Friday grid, now/today styling, overlaps, overnight splitting, DST-aware wall time | 4.1, 4.4, 4.8 |
| FR-12 Contact Information | Email, phone, office with empty-state handling | 4.4, 4.8 |
| FR-13 QR contact sharing | Offline vCard 3.0 QR with quiet zone and high contrast | 4.5 standard format, 4.7 offline |
| FR-14 Display navigation | Persistent tabs, horizontal swipe, idle return, views kept mounted | 4.1 response time, 4.8 touch usability |
| FR-15 Pairing/configuration | First-run setup, real validation, physical-keyboard input, persistent association, protected re-pair | 4.6 security, reliability |
| Polling freshness | 10 s default, 15 s normal maximum, request timeout, no overlap, capped backoff, SSE diffing | 4.1 latency, 4.3 resources, 4.7 reliability |
| Offline cache | Atomic last-good JSON, cold-start cache, corruption tolerance, two warning levels | 4.7 degraded operation |
| Local boundary | Loopback-only Express, API key omitted from public state/DOM after pairing, HTTPS production URL | 4.6 security |
| Adaptive kiosk UI | CSS Grid, `clamp()`, rem/vw sizing, portrait rules, Chromium kiosk controls | 4.4 resolution adaptability |
| Accessibility settings | Text scaling, high contrast, non-colour cues, semantic landmarks/ARIA, reduced motion | 4.8 accessibility |
| Longevity | Optional minute pixel shift and configurable overnight dim schedule | 4.3 resource/longevity |
| Time correctness | Configurable IANA timezone, NZ DST tests, implausible-clock warning | 4.7 reliability |
| Process reliability | `Restart=always`, graceful SIGTERM/SIGINT, atomic rename, request abort | 4.7 reliability |

## Security notes

- The Express listener is hard-coded to `127.0.0.1`.
- Production Diary Server URLs must use HTTPS; HTTP is accepted only for loopback mock development.
- The server never logs the API key, never returns it from `/local/state`, and never embeds it in built frontend assets.
- The display exposes no academic account, management, booking, or Diary Server write operation.
- `.env`, the data directory, caches, and installed environment file are excluded from source control or created with restricted permissions.
