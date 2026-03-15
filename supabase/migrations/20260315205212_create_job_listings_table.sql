/*
  # Create job_listings table

  ## Summary
  Creates the job_listings table for the Website Tools / Offene Stellen feature.
  Restaurants can post job openings which are displayed via a public embeddable widget.

  ## New Tables

  ### job_listings
  - `id` (uuid, primary key) — unique identifier
  - `title` (text) — job title, e.g. "Servicekraft (m/w/d)"
  - `department` (text) — department/area, e.g. "Service", "Küche", "Bar"
  - `location` (text) — work location
  - `job_type` (text) — employment type: Vollzeit, Teilzeit, Minijob, Aushilfe, Praktikum
  - `description` (text) — full job description
  - `requirements` (text) — requirements / qualifications
  - `apply_email` (text) — email address for applications (optional)
  - `apply_url` (text) — external application URL (optional)
  - `is_active` (boolean) — whether the listing is publicly visible
  - `sort_order` (integer) — display order in widget
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Public (anonymous) can SELECT active listings (for the embeddable widget)
  - Authenticated admin users can INSERT, UPDATE, DELETE
*/

CREATE TABLE IF NOT EXISTS job_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  job_type text NOT NULL DEFAULT 'Vollzeit',
  description text NOT NULL DEFAULT '',
  requirements text NOT NULL DEFAULT '',
  apply_email text NOT NULL DEFAULT '',
  apply_url text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active job listings"
  ON job_listings FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all job listings"
  ON job_listings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert job listings"
  ON job_listings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update job listings"
  ON job_listings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete job listings"
  ON job_listings FOR DELETE
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION update_job_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER job_listings_updated_at
  BEFORE UPDATE ON job_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_job_listings_updated_at();
