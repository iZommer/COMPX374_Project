# Kei Hea a Nic? — Where is Nic?

An academic availability and office display system for SCMS at the University of Waikato. This repository contains two parts:

- **Web application and Diary Server**: a Next.js dashboard and API, using Firebase Authentication and Neon PostgreSQL. Deploy this part to Vercel.
- **Digital Office Display**: a Raspberry Pi kiosk client in [`display-client/`](display-client/). It reads the Diary Server's public display endpoint and keeps a local cache for network outages.

The web app supports email/password accounts, availability and return messages, contact details, weekly calendar events, `.ics` imports, display keys, and display preferences. Calendar data is entered manually or imported from a file; live synchronization with university or external calendars is not included.

## Web application setup

Requires Node.js 22 or newer and npm.

1. Install dependencies with `npm ci`. The install hook generates the Prisma client.
2. Copy [`env_examples/env_example.txt`](env_examples/env_example.txt) to `.env` and replace its placeholders with your own credentials. This is an example configuration, not a credentials file.
3. Create a Neon project. Set `DATABASE_URL` to its pooled connection string and `DIRECT_URL` to its direct connection string. Keep `sslmode=require` on both.
4. Create a Firebase project and Web app. Enable **Email/Password** sign-in. Put the Web app configuration in the `NEXT_PUBLIC_FIREBASE_*` variables. Generate a Firebase Admin service account key and put its project ID, client email, and private key in the server-only `FIREBASE_*` variables. Keep the private key's newlines encoded as `\n`; never put Admin credentials in `NEXT_PUBLIC_*` variables.
5. Apply the database migrations to your development database with `npx prisma migrate dev`.
6. Start the app with `npm run dev` and open `http://localhost:3000`. Register an account; the first authenticated API request creates that account's application records.

Keep `.env`, service account JSON files, database URLs, and display keys private. Do not commit real credentials.

### Web application environment variables

| Variable | Used by | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Prisma runtime | Neon pooled PostgreSQL connection string, including `sslmode=require`. |
| `DIRECT_URL` | Prisma migrations | Neon direct (non-pooled) connection string, including `sslmode=require`. |
| `FIREBASE_PROJECT_ID` | Firebase Admin | Project ID from the Firebase service-account JSON. |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin | Service-account client email. |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin | Complete PEM `private_key`; preserve newlines as literal `\n` sequences in `.env` or the Vercel value. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Browser Firebase SDK | Web app API key. Public Firebase Web configuration, not an Admin credential. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Browser Firebase SDK | Firebase Web app auth domain. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Browser Firebase SDK | Firebase project ID used by the Web app. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Browser Firebase SDK | Firebase Web app ID. |

The server validates Firebase Admin configuration when an authenticated API request needs token verification. The browser-side Firebase settings are embedded by Next.js at build time, so changing those values in Vercel requires a new deployment.

## Deploy the web app

1. Import the repository root into Vercel as a Next.js project, using Node.js 22 or newer. Keep the project root at the repository root so Vercel finds `package.json` and `prisma/`.
2. Add the variables from `env_examples/env_example.txt` to the Vercel environment. Use separate Firebase and Neon resources for previews where practical. Redeploy after changing `NEXT_PUBLIC_FIREBASE_*` values because they are included at build time.
3. Apply migrations to the target database with `npx prisma migrate deploy` using the production `DATABASE_URL` and `DIRECT_URL`. Run this from a trusted machine or deployment pipeline; do not use `migrate dev` against production. The deployed Vercel build runs `prisma generate` through the `build` script; it does not apply migrations automatically.
4. Deploy from Vercel and add the deployed hostname to Firebase Authentication's authorized domains. Confirm that the public `/api/display/<key>/latest` endpoint is not blocked by Vercel Deployment Protection, since the Pi uses the key rather than a Vercel login.
5. Sign in, enter the dashboard, configure availability/calendar/contact details, and retrieve or rotate the display key from the Display page before pairing the Pi.

The database schema and versioned migrations are in [`prisma/`](prisma/). Production builds run with `npm run build`.

## Raspberry Pi display client

See [`display-client/README.md`](display-client/README.md) for local development, pairing, installation, service management, and troubleshooting. The client polls the deployed Diary Server over HTTPS, validates responses, caches the last successful data, and displays status, calendar, and contact views. It does not write to the web app.

The environment example for the Pi is [`env_examples/display_client_env_example.txt`](env_examples/display_client_env_example.txt). Pairing can also be completed through the on-screen setup using the deployed server URL and display key.

## API overview

Dashboard API routes require a Firebase ID token in `Authorization: Bearer <token>`. The display endpoint is read-only and uses its unguessable key:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET`, `PUT` | `/api/availability` | Read or update availability |
| `GET`, `POST`, `PUT` | `/api/calendar` | Read, create, or update calendar events |
| `POST` | `/api/calendar/import` | Import an iCalendar `.ics` file |
| `GET`, `PUT` | `/api/contact` | Read or update visitor contact details |
| `GET`, `PUT` | `/api/profile` | Read or update the signed-in academic's display name |
| `GET`, `POST` | `/api/display-key` | Retrieve or rotate the display key |
| `GET`, `PUT` | `/api/display-settings` | Read or update display preferences |
| `GET` | `/api/display/<key>/latest` | Read display data for the paired client |
| `POST` | `/api/calendar/bulk-delete` | Delete selected calendar events or recurring occurrences |

`/api/calendar` also supports `DELETE` for a single event or recurring-event scope. All dashboard routes require a Firebase ID token; the display route instead uses its key as a bearer credential and returns only display-facing data.

The display payload contains visitor-facing information only. Treat its key and URL as secrets; rotating the key invalidates the previous one.

## Development checks

```sh
npm run typecheck
npm test
npm run build
```

These checks exercise local code and do not verify live Firebase, Neon, Vercel, or Raspberry Pi hardware. Configure real service accounts and test the deployed setup separately.
