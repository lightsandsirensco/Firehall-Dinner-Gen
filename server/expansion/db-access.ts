import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";

let db: SqliteDatabase | null = null;

export async function initExpansionDb(): Promise<void> {
  db = await getSharedLocalDb();
}

export function requireCuratedDb(): SqliteDatabase {
  if (!db) {
    throw new Error("Expansion DB not initialized — call initExpansionDb() or initCuratedRecipeStore() first");
  }
  return db;
}

export function setExpansionDb(database: SqliteDatabase): void {
  db = database;
}
