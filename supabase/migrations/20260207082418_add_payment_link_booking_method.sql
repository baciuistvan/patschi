/*
  # Add payment_link to booking_method constraint

  1. Changes
    - Drops the existing check constraint on booking_method
    - Creates a new check constraint that includes 'payment_link' as a valid value
    - This allows reservations created via Stripe payment links to be saved properly

  2. Security
    - No RLS changes
    - Maintains data integrity with updated constraint
*/

-- Drop the existing constraint
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_booking_method_check;

-- Add new constraint with payment_link included
ALTER TABLE reservations 
ADD CONSTRAINT reservations_booking_method_check 
CHECK (booking_method IN ('online', 'manual', 'free', 'payment_link'));
