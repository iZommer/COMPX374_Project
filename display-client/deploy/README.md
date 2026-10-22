# Deployment files

This directory contains the Raspberry Pi installation and kiosk startup scripts plus the systemd unit template.

- `install.sh` installs the built display application under `/opt/where-is-nic`, stores persistent settings under `/var/lib/where-is-nic`, and configures service startup.
- `launch-kiosk.sh` waits for the local service and opens its interface in Chromium kiosk mode.
- `where-is-nic.service` runs the local Express service through systemd.

Run the installer from the repository's `display-client` directory with `sudo ./deploy/install.sh`. See the [display-client guide](../README.md) for prerequisites, configuration, and first boot behavior.
