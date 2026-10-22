# Shared application logic

This directory contains code used by multiple routes and pages:

- `auth.ts`, `admin.ts`, `firebase.ts`, and `db.ts` integrate Firebase Authentication and Prisma.
- `http.ts` standardizes API responses, input-body limits, and safe diagnostics.
- `validation.ts`, `status-resolution.ts`, `recurrence.ts`, `ics.ts`, and `time.ts` implement shared input and calendar rules.
- `client-api.ts` provides authenticated browser requests.

Server-only modules are marked with the `server-only` package to prevent accidental browser imports.
