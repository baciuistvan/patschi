/*
  # Add Stripe Mode Settings
  
  1. Changes
    - Add stripe_mode setting (test/live) to control which Stripe keys to use
    - Add default value 'test' to start with test mode
    - This allows quick switching between test and live Stripe environments
  
  2. Notes
    - stripe_mode: 'test' or 'live' to control API mode
    - Environment variables should contain both test and live keys
    - This setting determines which set of keys to use
*/

-- Add stripe_mode setting if it doesn't exist
INSERT INTO settings (key, value, description, updated_at)
VALUES (
  'stripe_mode',
  'test',
  'Stripe API mode: test or live',
  now()
)
ON CONFLICT (key) DO NOTHING;
