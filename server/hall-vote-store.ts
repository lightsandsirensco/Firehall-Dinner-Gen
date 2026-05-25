import crypto from "crypto";
import { nanoid } from "nanoid";
import { log } from "./index";
import type {
  GenerateResponse,
  HallVoteOption,
  HallVoteResponse,
  VoteOptionInput,
} from "@shared/schema";
import { getSharedLocalDb, type SqliteDatabase } from "./sqlite";

let db: SqliteDatabase;

function getDb(): SqliteDatabase {
  if (!db) {
    throw new Error("Hall vote store not initialized — call initHallVoteTables() first");
  }
  return db;
}

export async function initHallVoteTables() {
  db = await getSharedLocalDb();
  const d = getDb();
  d.exec(`
    CREATE TABLE IF NOT EXISTS hall_votes (
      vote_id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Tonight''s Hall Vote',
      options_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      total_votes INTEGER NOT NULL DEFAULT 0,
      creator_session_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hall_vote_ballots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vote_id TEXT NOT NULL,
      option_id INTEGER NOT NULL,
      fingerprint_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(vote_id, fingerprint_hash),
      FOREIGN KEY (vote_id) REFERENCES hall_votes(vote_id)
    );

    CREATE INDEX IF NOT EXISTS idx_ballots_vote_id ON hall_vote_ballots(vote_id);
  `);
  log("Hall vote tables initialized", "vote");
}

export function createVoteId(): string {
  return nanoid(10);
}

export function hashVoterFingerprint(ip: string, userAgent: string): string {
  const salt = "firehall-vote-salt-2024";
  return crypto.createHash("sha256").update(`${ip}|${userAgent}|${salt}`).digest("hex").substring(0, 32);
}

export function createHallVote(
  title: string,
  options: VoteOptionInput[],
  creatorSessionId: string
): { voteId: string } {
  const d = getDb();
  const voteId = createVoteId();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const optionsWithIds = options.map((opt, i) => ({
    option_id: i,
    name: opt.name,
    description: opt.description,
    est_cost: opt.est_cost || "",
    est_time: opt.est_time || "",
    recipe_payload: opt.recipe_payload,
  }));

  d.prepare(`
    INSERT INTO hall_votes (vote_id, title, options_json, status, total_votes, creator_session_id, expires_at)
    VALUES (?, ?, ?, 'open', 0, ?, ?)
  `).run(voteId, title, JSON.stringify(optionsWithIds), creatorSessionId, expiresAt);

  log(`[hallvote] created voteId=${voteId} options=${options.length}`, "hallvote");
  return { voteId };
}

export function getHallVote(voteId: string, sessionId?: string, fingerprint?: string): HallVoteResponse | null {
  const d = getDb();
  const row = d.prepare("SELECT * FROM hall_votes WHERE vote_id = ?").get(voteId) as any;
  if (!row) return null;

  let status = row.status as "open" | "closed";
  if (status === "open" && new Date(row.expires_at) <= new Date()) {
    d.prepare("UPDATE hall_votes SET status = 'closed' WHERE vote_id = ?").run(voteId);
    status = "closed";
  }

  const options: HallVoteOption[] = JSON.parse(row.options_json);

  const ballots = d.prepare(
    "SELECT option_id, COUNT(*) as cnt FROM hall_vote_ballots WHERE vote_id = ? GROUP BY option_id"
  ).all(voteId) as { option_id: number; cnt: number }[];

  const countMap = new Map<number, number>();
  ballots.forEach((b) => countMap.set(b.option_id, b.cnt));

  options.forEach((opt) => {
    opt.vote_count = countMap.get(opt.option_id) || 0;
  });

  let userVote: number | undefined;
  if (fingerprint) {
    const ballot = d.prepare(
      "SELECT option_id FROM hall_vote_ballots WHERE vote_id = ? AND fingerprint_hash = ?"
    ).get(voteId, fingerprint) as any;
    if (ballot) userVote = ballot.option_id;
  }

  const canClose = !!(sessionId && row.creator_session_id === sessionId);

  let winner: number | undefined;
  if (status === "closed" && row.total_votes > 0) {
    let maxVotes = 0;
    let winnerId: number | undefined;
    options.forEach((opt) => {
      if (opt.vote_count > maxVotes) {
        maxVotes = opt.vote_count;
        winnerId = opt.option_id;
      }
    });
    winner = winnerId;
  }

  return {
    vote_id: voteId,
    title: row.title,
    options,
    status,
    created_at: row.created_at,
    expires_at: row.expires_at,
    total_votes: row.total_votes,
    user_vote: userVote,
    can_close: canClose,
    winner,
  };
}

export function castBallot(
  voteId: string,
  optionId: number,
  fingerprint: string
): { success: boolean; error?: string; totalVotes?: number } {
  const d = getDb();

  const vote = d.prepare("SELECT status, expires_at, options_json FROM hall_votes WHERE vote_id = ?").get(voteId) as any;
  if (!vote) return { success: false, error: "Vote not found" };

  if (vote.status === "closed" || new Date(vote.expires_at) <= new Date()) {
    return { success: false, error: "This vote has ended" };
  }

  const options = JSON.parse(vote.options_json);
  if (optionId < 0 || optionId >= options.length) {
    return { success: false, error: "Invalid option" };
  }

  try {
    const txn = d.transaction(() => {
      d.prepare(
        "INSERT INTO hall_vote_ballots (vote_id, option_id, fingerprint_hash) VALUES (?, ?, ?)"
      ).run(voteId, optionId, fingerprint);

      d.prepare(
        "UPDATE hall_votes SET total_votes = total_votes + 1 WHERE vote_id = ?"
      ).run(voteId);

      const totalRow = d.prepare("SELECT total_votes FROM hall_votes WHERE vote_id = ?").get(voteId) as any;
      return totalRow.total_votes;
    });

    const totalVotes = txn() as number;
    return { success: true, totalVotes };
  } catch (err: any) {
    if (err.message?.includes("UNIQUE constraint failed")) {
      return { success: false, error: "You already voted" };
    }
    throw err;
  }
}

export function closeHallVote(voteId: string, sessionId: string): { success: boolean; error?: string } {
  const d = getDb();
  const vote = d.prepare("SELECT creator_session_id, status FROM hall_votes WHERE vote_id = ?").get(voteId) as any;
  if (!vote) return { success: false, error: "Vote not found" };
  if (vote.status === "closed") return { success: false, error: "Vote is already closed" };
  if (vote.creator_session_id !== sessionId) {
    return { success: false, error: "Only the creator can close this vote" };
  }

  d.prepare("UPDATE hall_votes SET status = 'closed' WHERE vote_id = ?").run(voteId);
  log(`[hallvote] closed voteId=${voteId}`, "hallvote");
  return { success: true };
}
