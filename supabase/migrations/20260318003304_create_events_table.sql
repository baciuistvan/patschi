/*
  # Create Events Table

  ## Summary
  Creates a new `events` table for managing public-facing events (parties, live music, DJ nights, etc.)
  that can be displayed via an embeddable widget on external websites.

  ## New Tables
  - `events`
    - `id` (uuid, primary key)
    - `title` (text, required) - Event name
    - `subtitle` (text) - Optional short tagline
    - `date` (date, required) - Event date
    - `start_time` (time) - Optional start time
    - `end_time` (time) - Optional end time
    - `description` (text) - Full description shown in expanded detail panel
    - `location` (text) - Location or venue name
    - `price` (numeric) - Numeric price value (nullable = free)
    - `price_label` (text) - Display label e.g. "Eintritt frei", "ab 15 EUR"
    - `image_url` (text) - Optional image URL
    - `category` (text) - Event category e.g. "Party", "Live Music", "DJ Night"
    - `is_active` (boolean, default true) - Whether event is publicly visible
    - `is_featured` (boolean, default false) - Whether event is featured/highlighted
    - `sort_order` (integer, default 0) - Manual sort order override
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Anon users can read active events (for widget)
  - Authenticated users get full CRUD access (for admin panel)
*/

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  subtitle text DEFAULT '',
  date date NOT NULL,
  start_time time DEFAULT NULL,
  end_time time DEFAULT NULL,
  description text DEFAULT '',
  location text DEFAULT '',
  price numeric(10, 2) DEFAULT NULL,
  price_label text DEFAULT '',
  image_url text DEFAULT '',
  category text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active events"
  ON events FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Authenticated users can read all events"
  ON events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update events"
  ON events FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete events"
  ON events FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS events_date_idx ON events (date ASC);
CREATE INDEX IF NOT EXISTS events_is_active_idx ON events (is_active);
CREATE INDEX IF NOT EXISTS events_sort_order_idx ON events (sort_order ASC, date ASC);
