# Local display server

The Express server loads configuration and persistent state, serves the built browser client, and exposes local setup/state endpoints. `poller.ts` requests the Diary Server payload, `storage.ts` validates and persists the pairing/cache, and `config.ts` resolves environment defaults. The kiosk browser receives state updates from this server over Server-Sent Events.
