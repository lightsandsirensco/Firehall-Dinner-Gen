-- Founder leads dashboard: mark test accounts for safe cleanup

ALTER TABLE admin_user_meta ADD COLUMN is_test_account INTEGER NOT NULL DEFAULT 0;
