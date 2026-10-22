# Application routes

This directory contains the Next.js App Router entry points.

- `page.tsx`, `login/`, and `register/` provide the public entry and authentication screens.
- `dashboard/` contains authenticated client-side editors for availability, calendar, contact details, display pairing, and settings.
- `api/` contains server route handlers. Dashboard handlers validate Firebase ID tokens and use `lib/` for data access and domain logic; the display endpoint uses its display key.
- `layout.tsx` installs global metadata, styles, and the authentication context.

Keep route handlers thin where possible; shared rules belong in `lib/`.
