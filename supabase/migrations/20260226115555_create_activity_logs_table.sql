/*
  # Create Activity Logs Table

  ## Purpose
  A unified, append-only audit log capturing every meaningful event across
  all systems: reservations, tables, crew sessions, gift cards, and
  abandoned bookings.

  ## New Tables
  - `activity_logs`
    - `id` (uuid, primary key)
    - `event_type` (text) – machine-readable slug, e.g. "reservation_created"
    - `actor_type` (text) – one of: admin | crew | system | online
    - `actor_id` (text, nullable) – UUID of the admin/crew user, if known
    - `actor_name` (text, nullable) – display name of the actor
    - `entity_type` (text, nullable) – e.g. "reservation", "gift_card"
    - `entity_id` (text, nullable) – UUID of the affected record
    - `description` (text) – human-readable summary
    - `metadata` (jsonb, nullable) – arbitrary extra detail
    - `created_at` (timestamptz) – when the event occurred

  ## Indexes
  - `idx_activity_logs_created_at` – fast time-range queries
  - `idx_activity_logs_event_type`  – filter by event category
  - `idx_activity_logs_entity`      – look up all events for one entity

  ## Security
  - RLS enabled; only authenticated users may SELECT or DELETE rows.
  - No public write access – inserts come from trusted service-role contexts
    (edge functions and DB triggers).
*/

CREATE TABLE IF NOT EXISTS activity_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text        NOT NULL,
  actor_type  text        NOT NULL DEFAULT 'system',
  actor_id    text,
  actor_name  text,
  entity_type text,
  entity_id   text,
  description text        NOT NULL DEFAULT '',
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
  ON activity_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type
  ON activity_logs (event_type);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity
  ON activity_logs (entity_type, entity_id);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete activity logs"
  ON activity_logs FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert activity logs"
  ON activity_logs FOR INSERT
  TO service_role
  WITH CHECK (true);
