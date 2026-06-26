# Database backup & restore

Firehall Meals stores application state in `data/cache.db` (SQLite via sql.js).

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SQLITE_DB_PATH` | `data/cache.db` | Live database file |
| `BACKUP_DIR` | `data/backups` | Timestamped backup directory |
| `BACKUP_RETENTION_DAYS` | `30` | Auto-prune backups older than this |
| `ENABLE_DAILY_BACKUP` | enabled | Set `false` to disable server daily backup |

## Commands

```bash
# Create timestamped backup + prune old files
npm run backup

# Verify newest backup (or pass a path)
npm run verify-backup
npm run verify-backup -- data/backups/cache-2026-06-22T12-00-00-000Z.db

# Restore from backup (stops if target exists unless --force)
npm run restore -- data/backups/cache-2026-06-22T12-00-00-000Z.db --force
```

## Restore procedure

1. **Stop the server** so the live DB is not written during restore.
2. **Optional:** create a safety copy: `npm run backup`
3. **Verify** the backup: `npm run verify-backup -- <backup-file>`
4. **Restore:** `npm run restore -- <backup-file> --force`
5. **Restart** the server: `npm run start` (production) or `npm run dev`
6. **Smoke test:** open `/api/health` and confirm `stores` are `ok`.

If restore fails integrity, the previous database is left at `<path>.pre-restore.<timestamp>` when `--force` was used.

## Daily automatic backup

In production, the server runs a daily backup (UTC calendar day) unless `ENABLE_DAILY_BACKUP=false`. Backups use the same integrity check as `npm run backup`.

For external cron (e.g. host without long-running process):

```bash
0 3 * * * cd /path/to/Firehall-Dinner-Gen && npm run backup >> /var/log/firehall-backup.log 2>&1
```
