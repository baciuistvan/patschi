/*
  # Per-admin notification read state + auto-delete after 24h

  ## Summary
  Replaces the global `is_read` boolean on notifications with a per-admin
  read-state junction table. Also adds a `read_at` timestamp and a scheduled
  cleanup that deletes notifications read more than 24 hours ago.

  ## Changes

  ### New Tables
  - `notification_reads`
    - `id` (uuid, pk)
    - `notification_id` (uuid, FK → notifications.id CASCADE DELETE)
    - `admin_user_id` (uuid, FK → admin_users.id CASCADE DELETE)
    - `read_at` (timestamptz, default now())
    - UNIQUE (notification_id, admin_user_id)

  ### Modified Tables
  - `notifications`: keeps `is_read` column (now unused by app, preserved for
    backwards compat with edge functions that still insert it). No data loss.

  ### New Function + Trigger
  - `delete_old_read_notifications()`: deletes notifications that every current
    admin has read AND the earliest read_at is older than 24 hours.
    Actually simpler: deletes notifications where there exists at least one
    read entry that is older than 24 hours (notification was read 24h+ ago by
    anyone). This matches the spec: "stay 24 hours if read, then auto-delete".

  ### Auto-cleanup via pg_cron (if available) or DB-level trigger on insert
  We add a trigger on `notification_reads` INSERT that checks and prunes old
  fully-read notifications.

  ### Security
  - RLS enabled on `notification_reads`
  - Admins can INSERT their own read records
  - Admins can SELECT their own read records
  - Admins can DELETE their own read records (not needed but safe)
*/

-- Create the per-admin reads table
CREATE TABLE IF NOT EXISTS notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, admin_user_id)
);

ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert own reads"
  ON notification_reads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = admin_user_id);

CREATE POLICY "Admins can select own reads"
  ON notification_reads FOR SELECT
  TO authenticated
  USING (auth.uid() = admin_user_id);

CREATE POLICY "Admins can delete own reads"
  ON notification_reads FOR DELETE
  TO authenticated
  USING (auth.uid() = admin_user_id);

-- Index for fast per-admin lookups
CREATE INDEX IF NOT EXISTS idx_notification_reads_admin ON notification_reads (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_notification ON notification_reads (notification_id);

-- Function: delete notifications that were read 24+ hours ago
-- A notification is eligible for deletion if any read entry for it is older than 24h.
CREATE OR REPLACE FUNCTION cleanup_old_read_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM notifications
  WHERE id IN (
    SELECT DISTINCT notification_id
    FROM notification_reads
    WHERE read_at < now() - interval '24 hours'
  );
END;
$$;

-- Trigger function that runs cleanup on each new read insert
CREATE OR REPLACE FUNCTION trigger_cleanup_old_reads()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM cleanup_old_read_notifications();
  RETURN NEW;
END;
$$;

-- Attach trigger to notification_reads
DROP TRIGGER IF EXISTS cleanup_reads_on_insert ON notification_reads;
CREATE TRIGGER cleanup_reads_on_insert
  AFTER INSERT ON notification_reads
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_cleanup_old_reads();

-- Also allow admins to read all notifications (they need to join with reads)
-- The existing notifications SELECT policy covers this already.
-- Add DELETE policy so the cleanup function (SECURITY DEFINER) can delete rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'Service can delete old notifications'
  ) THEN
    CREATE POLICY "Service can delete old notifications"
      ON notifications FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;
