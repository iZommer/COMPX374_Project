# Kei Hea a Nic? Where is Nic?

Academic Web Application and Diary Server for SCMS, University of Waikato. One Next.js App Router deployment provides the dashboard and API. Neon PostgreSQL is the source of truth; Firebase manages email/password credentials. No Raspberry Pi client, poller, external calendar integration, OAuth, or custom domain is included.

## Local setup

Requires Node.js 22 LTS and npm.

1. Run `npm ci`.
2. Copy `.env.example` to `.env` and replace all placeholders. Both Prisma and Next.js read `.env`. Never put Admin credentials in `NEXT_PUBLIC_*` variables. No actual environment file is supplied.
3. Create a project in [Neon](https://console.neon.tech). Set `DATABASE_URL` to the pooled database connection and `DIRECT_URL` to the direct/non-pooled connection. Retain `sslmode=require`. Choose a region near your Vercel functions. Prisma 6 uses `directUrl` for migrations and the pooled URL at runtime ([Prisma documentation](https://www.prisma.io/docs/orm/v6/overview/databases/neon)).
4. Create a project in the [Firebase console](https://console.firebase.google.com). Under Authentication → Sign-in method, enable **Email/Password only**; leave email-link and all other providers disabled. Register a Web app and copy its config into the four public Firebase variables.
5. Under Firebase Project settings → Service accounts, generate an Admin private key. Put the project ID, client email, and private key into the server-only variables. Quote the private key and encode newlines as literal `\n`. Do not commit the downloaded JSON. Add `localhost` to Authentication → Settings → Authorized domains if needed.
6. Run `npx prisma migrate dev` against your development database to apply the supplied initial migration and check drift. For later model changes, run `npx prisma migrate dev --name descriptive_change` and commit the generated migration. A restricted database role may need a separate Prisma shadow database for development migrations.
7. Run `npm run dev`, open [localhost:3000](http://localhost:3000), and register an account. The first authenticated API call provisions the academic and all one-to-one records atomically.

The academic name defaults to the Firebase name claim or email prefix. Editing the visitor contact email does not change the login email. Initial availability is **Out of office** with no return time/message.

## Vercel deployment

1. Push the project to a Git repository and import it into Vercel using the Next.js preset, Node.js 22, and repository root.
2. Add all `.env.example` variables to the intended environment. Use a separate Neon branch and preferably a separate Firebase project for previews. Public Firebase values are embedded at build time; changes require redeployment.
3. Apply migrations with `npx prisma migrate deploy` from a trusted machine or deployment pipeline using the target environment's connection variables. Never run `migrate dev` against production. Migrations are separate from builds so preview builds cannot change production accidentally.
4. Deploy using `npm run build`. Use the assigned `https://<project>.vercel.app` address, with no custom domain. Add its hostname to Firebase Authentication's authorized domains.
5. Verify all flows on that URL. Ensure Vercel Deployment Protection does not block the production display endpoint, which must be accessible with just its key.

Live integration/deployment requires your Firebase and Neon credentials. The repository builds without them because SDKs initialize lazily. Performance targets (interactive pages around 3 seconds, availability saves around 2 seconds, typical imports within 10 seconds) must be measured against deployed services. Imports show extra processing feedback after 2 seconds; the import function permits 15 seconds.

## Authentication and isolation

The Firebase Web SDK maintains the session. The dashboard waits for it and redirects unauthenticated visitors to `/login`; its static shell contains no academic records. Every academic API request independently verifies the ID token, including revocation/disabled-user checks, using the Admin SDK ([Firebase verification documentation](https://firebase.google.com/docs/auth/admin/verify-id-tokens)). Providers other than email/password are rejected.

The server resolves `firebaseUid` to an Academic, applying that ID to every query/mutation. Strict schemas reject extra ownership fields. Passwords go only to Firebase, never Prisma or application logs. All API responses use `Cache-Control: no-store, private`. The public payload explicitly selects visitor data and excludes Firebase UIDs, ownership IDs, account email, and display keys.

Display keys contain 32 random bytes encoded as 64 hex characters, stored in Neon for owner retrieval. They grant only read access to visitor information. Regeneration immediately replaces the key; the old URL returns 404. Treat keys and URLs as secrets, including in access logs. `pairedAt` remains null because actual pairing is outside this build.

## API contract

Academic routes require `Authorization: Bearer <Firebase ID token>`. JSON mutations use `Content-Type: application/json`. Errors return `{ "error": "Message" }`: 400 invalid input, 401 missing/expired token, 403 unsupported provider, 404 unknown key, 413 oversized upload, 415 unsupported content type, or 503 unavailable service.

| Method | Path                            | Request / result                                                    |
| ------ | ------------------------------- | ------------------------------------------------------------------- |
| GET    | `/api/availability`             | Current availability                                                |
| PUT    | `/api/availability`             | `{status, expectedReturnTime, customMessage}`; saved record         |
| GET    | `/api/calendar?week=2026-09-21` | Events overlapping selected Auckland week; defaults to current week |
| POST   | `/api/calendar`                 | `{title, startTime, endTime, status?}`; created manual event (201)   |
| PUT    | `/api/calendar`                 | `{id, title, startTime, endTime, status}`; updates an owned event   |
| POST   | `/api/calendar/import`          | Raw .ics bytes as `text/calendar`; `{imported, skipped, message}`   |
| GET    | `/api/contact`                  | Visitor contact details                                             |
| PUT    | `/api/contact`                  | `{email, phone, officeLocation}`; saved record                      |
| GET    | `/api/display-key`              | `{apiKey, pairedAt}`                                                |
| POST   | `/api/display-key`              | No body; rotate key and return `{apiKey, pairedAt}`                 |
| GET    | `/api/display/<apiKey>/latest`  | Public read-only payload below; no Firebase token                   |

Status is `AVAILABLE`, `IN_A_MEETING`, `TEACHING`, or `OUT_OF_OFFICE`. Expected return is an ISO 8601 timestamp with offset or null; message is at most 200 characters or null. Calendar events use the same status values and default to `IN_A_MEETING`. During an active event, its status, title, and end time override the manually saved availability on the display; the saved availability resumes when the event ends. Event timestamps require an offset and end after start. Contact email is required; phone/office may be empty strings. The display QR encodes the **raw key**, not a URL.

Example display response:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-09-24T00:00:00.000Z",
  "timezone": "Pacific/Auckland",
  "week": {
    "start": "2026-09-20T12:00:00.000Z",
    "end": "2026-09-27T11:00:00.000Z"
  },
  "academic": { "name": "Nic" },
  "availability": {
    "status": "IN_A_MEETING",
    "expectedReturnTime": "2026-09-24T02:30:00.000Z",
    "customMessage": "Please email me if urgent.",
    "updatedAt": "2026-09-24T00:00:00.000Z"
  },
  "calendar": [
    {
      "title": "Office hours",
      "startTime": "2026-09-24T03:00:00.000Z",
      "endTime": "2026-09-24T04:00:00.000Z",
      "source": "MANUAL"
    }
  ],
  "contact": {
    "email": "nic@example.org",
    "phone": "",
    "officeLocation": "G.2.15"
  }
}
```

The week runs Monday inclusive to the next Monday exclusive in Auckland; timestamps use UTC. Overlapping/multi-day events are included. A future device can request this URL every ≤15 seconds; no poller runs here. Availability remains manual during calendar events and after an expected return time passes.

## Calendar imports

The maintained [ical.js parser](https://github.com/kewisch/ical.js/wiki/Parsing-iCalendar) handles recurrence, EXDATE, moved/cancelled instances, and embedded VTIMEZONE definitions. IANA timezone IDs without VTIMEZONE use Luxon; floating/all-day dates default to Auckland. Unsupported timezones are rejected. UI dates use Auckland regardless of browser timezone.

Imports accept at most 1 MiB and expand from one month before import through one year after it, capped at 2,000 occurrences, 20,000 iterator steps, and a 5-second expansion budget. Invalid events/limits reject the entire import before database writes. Reimporting uses UID + original occurrence time to skip existing records atomically. Imports are **additive**: changed/removed occurrences do not overwrite/delete imported records. Manual events remain untouched. Reimport closer to the next semester to extend the window. Event editing/deletion and calendar synchronization are outside this MVP.

## Requirements traceability

FR identifiers come from the supplied SDD requirements/cross-reference table. The SRS uses section-local REQ identifiers; references below remove ambiguity.

| Code  | SRS section | Implementation                                                    |
| ----- | ----------- | ----------------------------------------------------------------- |
| FR-01 | §3.1        | Register/login, Firebase email/password, dashboard session gate   |
| FR-02 | §3.2        | Availability, return time/message, authenticated GET/PUT          |
| FR-03 | §3.3        | Single weekly calendar and scoped API                             |
| FR-04 | §3.5        | Contact editor and scoped GET/PUT                                 |
| FR-05 | §3.6        | Firebase bearer tokens, awaited saves and feedback                |
| FR-06 | §3.4        | .ics validation, recurrence expansion, import summary             |
| FR-07 | §3.1, §4.6  | Admin verification; server-derived ownership in every handler     |
| FR-08 | §3.7        | Prisma schema/migration, Neon persistence, cascading foreign keys |
| FR-09 | §3.8        | Uncached key-authenticated latest-information endpoint            |

FR-10–FR-15 device setup/kiosk/views/navigation/polling are excluded. Key management and the QR prepare only the backend association.

## Verification

```sh
npm run typecheck
npm test
npm run build
npm audit
```

Tests cover recurrence/DST, exceptions, import limits, validation, and API authorization with isolated mocks. Before release, use two real Firebase accounts against a development Neon branch: save different records and confirm isolation, import a semester timetable twice, check display payloads, rotate a key and confirm the old URL returns 404, then sign out and revisit a dashboard URL. Check mobile layouts and measure deployed performance. Isolated tests require no real credentials.

Dependency overrides select patched transitive packages; recheck them when upgrading dependencies.

The `jwks-rsa` override pins its `jose` dependency to 5.10.0, which provides a
CommonJS entry point. Without it, Firebase Admin 14's `jwks-rsa` dependency loads
ESM-only `jose` 6 using `require()`, crashing API startup on Vercel runtimes without
`require(esm)` support ([upstream issue](https://github.com/auth0/node-jwks-rsa/issues/507)).
Keep this override until the upstream loader/runtime incompatibility is resolved.
The runtime regression test disables `require(esm)` and checks both Firebase Admin
loading and RSA signing-key conversion. Commit `package.json` and `package-lock.json`
together and redeploy to apply the fix.

### Build verification (24 September 2026)

- Production build, TypeScript checks, and Prisma schema validation pass.
- 25 automated tests pass (8 calendar/validation tests and 17 API tests).
- Dependency audit reports zero known vulnerabilities for the supplied lockfile.
- Headless Edge smoke checks passed for the authentication redirect, all four dashboard pages, saves, event creation, import feedback, key rotation/QR, sign-out, and 390px mobile layouts, with no browser errors. These checks used mocked Firebase/API responses and do not establish live service integration.
- Live Neon migrations, real Firebase account flows, deployment, and performance measurements await your credentials and environment setup.
