# Dependency Repair — Diagnosis (pre-fix)

**Date:** 2026-06-02  
**Path:** `C:\Users\Mike\OneDrive\Desktop\Firehall-Dinner-Gen` (OneDrive-synced)

## Symptoms

| Symptom | Confirmed |
|---------|-----------|
| `npm install` EPERM on `node_modules/rollup/dist/bin` | Yes (terminal history, exit 1) |
| `npm run check` — `'tsc' is not recognized` | Yes |
| `npx tsx` — `ERR_MODULE_NOT_FOUND` … `tsx/dist/loader.mjs` | Yes |

## Findings

| Check | Result |
|-------|--------|
| `node_modules` exists | Yes (~401 top-level packages) |
| `node_modules/typescript/bin/tsc` | **Missing** |
| `node_modules/tsx/dist/loader.mjs` | **Missing** |
| `node_modules/.bin/tsc.cmd` | **Missing** |
| `node_modules/.bin/tsx.cmd` | **Missing** |
| `node_modules/rollup/dist/bin` | Partial (`rollup` folder only has `dist`) |
| `package-lock.json` | Present (~213 KB) — not obviously corrupt |
| Node processes on project port | None (only Cursor helper `node.exe` PIDs) |
| OneDrive | **Yes** — workspace under `OneDrive\Desktop` |

## Root cause (working hypothesis)

**Partial/corrupted `node_modules`** after failed `npm install` (EPERM during `rmdir` on Rollup). Windows + OneDrive file locking prevents npm from replacing packages, leaving broken installs of `typescript`, `tsx`, and incomplete `.bin` links.

## Repair plan

1. Stop stray Node/dev processes targeting this repo  
2. Remove `node_modules` entirely  
3. `npm cache clean --force`  
4. Fresh `npm install` (keep `package-lock.json` unless install still fails)  
5. Verify `npx tsc --version` and `npx tsx --version`  
6. Run `check`, `build`, `catalog:verify`, `dev`, smoke routes  
