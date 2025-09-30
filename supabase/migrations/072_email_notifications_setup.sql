-- 072_email_notifications_setup.sql
-- Email notifications preferences and logging

-- 1) Add email notification preferences to profiles (default: all opt-in)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_notifications jsonb NOT NULL DEFAULT jsonb_build_object(
  'chat_messages', true,
  'swap_requests', true,
  'swap_updates', true,
  'completion_reminders', true
);

-- 2) Track when a chat digest email was last sent (to enforce max 1/day)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_chat_email_sent timestamptz NULL;

-- 3) Email log table for deduplication/observability
CREATE TABLE IF NOT EXISTS email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email_type text NOT NULL,          -- e.g. 'chat_digest', 'swap_created', 'swap_cancelled', 'swap_approved', 'counter_offer', 'completion_reminder', 'swap_completed'
  reference_id text NULL,            -- e.g. swap_id or conversation_id
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_log_user_type_idx ON email_log(user_id, email_type);
CREATE INDEX IF NOT EXISTS email_log_reference_idx ON email_log(reference_id);

-- Optional: backfill last_chat_email_sent = NULL for all rows (no-op if already null)
UPDATE profiles SET last_chat_email_sent = NULL WHERE last_chat_email_sent IS NOT NULL AND last_chat_email_sent IS NULL;
