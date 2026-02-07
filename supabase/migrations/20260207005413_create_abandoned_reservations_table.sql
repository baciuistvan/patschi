/*
  # Create Abandoned Reservations Tracking Table

  1. New Tables
    - `abandoned_reservations`
      - `id` (uuid, primary key) - Unique identifier
      - `customer_name` (text) - Customer's name
      - `customer_email` (text) - Customer's email
      - `customer_phone` (text, optional) - Customer's phone number
      - `reservation_date` (date) - Requested reservation date
      - `reservation_time` (text) - Requested time slot
      - `party_size` (integer) - Number of people
      - `room_id` (uuid, optional) - Room they were booking
      - `room_name` (text, optional) - Room name for reference
      - `abandonment_stage` (text) - Where they dropped off (form_incomplete, payment_initiated, payment_failed, cancelled_before_payment)
      - `abandonment_reason` (text, optional) - Specific reason if known
      - `error_message` (text, optional) - Any error message from payment system
      - `payment_intent_id` (text, optional) - Stripe payment intent if created
      - `amount` (integer, optional) - Amount in cents if payment was attempted
      - `created_at` (timestamptz) - When the attempt was made
      - `updated_at` (timestamptz) - Last update time

  2. Security
    - Enable RLS on `abandoned_reservations` table
    - Only authenticated admin users can view abandoned reservations
    - Public insert allowed for tracking (no auth required)

  3. Indexes
    - Index on email for finding repeat abandoners
    - Index on created_at for time-based queries
    - Index on abandonment_stage for analytics
*/

CREATE TABLE IF NOT EXISTS abandoned_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  reservation_date date NOT NULL,
  reservation_time text NOT NULL,
  party_size integer NOT NULL,
  room_id uuid,
  room_name text,
  abandonment_stage text NOT NULL DEFAULT 'form_incomplete',
  abandonment_reason text,
  error_message text,
  payment_intent_id text,
  amount integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_abandoned_reservations_email ON abandoned_reservations(customer_email);
CREATE INDEX IF NOT EXISTS idx_abandoned_reservations_created_at ON abandoned_reservations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_abandoned_reservations_stage ON abandoned_reservations(abandonment_stage);
CREATE INDEX IF NOT EXISTS idx_abandoned_reservations_date ON abandoned_reservations(reservation_date);

-- Enable Row Level Security
ALTER TABLE abandoned_reservations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public to insert (tracking abandonment)
CREATE POLICY "Anyone can log abandoned reservations"
  ON abandoned_reservations
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Only authenticated users (admins) can view
CREATE POLICY "Authenticated users can view abandoned reservations"
  ON abandoned_reservations
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can update (for adding notes, etc.)
CREATE POLICY "Authenticated users can update abandoned reservations"
  ON abandoned_reservations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete old records
CREATE POLICY "Authenticated users can delete abandoned reservations"
  ON abandoned_reservations
  FOR DELETE
  TO authenticated
  USING (true);

-- Create a function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_abandoned_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_abandoned_reservations_updated_at_trigger ON abandoned_reservations;
CREATE TRIGGER update_abandoned_reservations_updated_at_trigger
  BEFORE UPDATE ON abandoned_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_abandoned_reservations_updated_at();