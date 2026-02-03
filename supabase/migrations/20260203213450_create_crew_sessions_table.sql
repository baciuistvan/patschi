/*
  # Create crew_sessions table

  1. New Tables
    - `crew_sessions`
      - `id` (uuid, primary key)
      - `crew_user_id` (uuid, foreign key to crew_users)
      - `token` (text, unique, indexed)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `crew_sessions` table
    - Add policy for service role to manage sessions
*/

CREATE TABLE IF NOT EXISTS crew_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_user_id uuid NOT NULL REFERENCES crew_users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crew_sessions_token ON crew_sessions(token);
CREATE INDEX IF NOT EXISTS idx_crew_sessions_expires_at ON crew_sessions(expires_at);

ALTER TABLE crew_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage crew sessions"
  ON crew_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
