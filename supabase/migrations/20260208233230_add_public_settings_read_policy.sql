/*
  # Allow public read access to safe settings
  
  1. Changes
    - Add RLS policy to allow anonymous users to read public-safe settings
    - Only allows reading Stripe publishable keys and mode settings
    - Prevents access to secret keys and sensitive settings
  
  2. Security
    - Restricts access to only non-sensitive configuration values
    - Secret keys remain protected
*/

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow public read access to safe settings" ON settings;
  DROP POLICY IF EXISTS "Allow authenticated read access to safe settings" ON settings;
END $$;

-- Allow anonymous users to read public-safe settings
CREATE POLICY "Allow public read access to safe settings"
  ON settings
  FOR SELECT
  TO anon
  USING (
    key IN (
      'stripe_enabled',
      'stripe_mode',
      'stripe_test_publishable_key',
      'stripe_live_publishable_key',
      'deposit_amount',
      'business_name',
      'business_email',
      'business_phone'
    )
  );

-- Also allow authenticated users to read these same settings
CREATE POLICY "Allow authenticated read access to safe settings"
  ON settings
  FOR SELECT
  TO authenticated
  USING (
    key IN (
      'stripe_enabled',
      'stripe_mode',
      'stripe_test_publishable_key',
      'stripe_live_publishable_key',
      'deposit_amount',
      'business_name',
      'business_email',
      'business_phone'
    )
  );
