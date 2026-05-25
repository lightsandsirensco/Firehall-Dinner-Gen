#!/bin/bash
set -e
npm install
npm run db:push || true
npx tsx scripts/replit-post-deploy.ts
