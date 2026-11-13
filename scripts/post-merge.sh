#!/bin/bash
set -e
npm install
# No `db:push`: drizzle-kit push diffs the live DATABASE_URL against shared/schema.ts, which
# doesn't declare the app's tables. Postgres schema changes go only through `npm run db:pg:migrate`.
npx tsx scripts/replit-post-deploy.ts
