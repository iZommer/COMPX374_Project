# Web application tests

Tests cover API behavior and shared domain logic. Files named `*.test.ts` run with Node's built-in test runner through `tsx`; `*.spec.ts` files run with Vitest. `vitest.config.mts` maps the `server-only` marker to a test shim and selects the Node environment. The root `npm test` script runs both groups.
