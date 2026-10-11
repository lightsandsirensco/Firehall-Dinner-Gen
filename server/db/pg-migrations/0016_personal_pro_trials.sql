-- Personal Pro reverse trial — 14 days of Firehall Meals Pro, no card, once
-- per account (shared/billing/pro-trial.ts).
--
-- One row per user, ever: the primary key is the durable "trial used"
-- protection. Rows are never deleted on expiry; expiry is purely
-- trial_expires_at <= now(), so access ends on time with no job.

CREATE TABLE IF NOT EXISTS personal_pro_trials (
  user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  trial_started_at TIMESTAMPTZ NOT NULL,
  trial_expires_at TIMESTAMPTZ NOT NULL,
  start_source TEXT NOT NULL CHECK (start_source IN ('first_shift_plan', 'paywall')),
  paywall_source TEXT,
  ending_notice_seen_at TIMESTAMPTZ,
  expired_notice_seen_at TIMESTAMPTZ,
  expired_recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (trial_expires_at > trial_started_at)
);
