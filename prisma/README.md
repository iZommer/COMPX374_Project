# Database schema and migrations

`schema.prisma` defines the PostgreSQL models and Prisma client. Versioned SQL migrations under `migrations/` record schema changes and are applied in order with `npx prisma migrate deploy`. For local development, use `npx prisma migrate dev`; do not use it against production. Prisma reads the pooled runtime URL from `DATABASE_URL` and the direct migration URL from `DIRECT_URL`.
