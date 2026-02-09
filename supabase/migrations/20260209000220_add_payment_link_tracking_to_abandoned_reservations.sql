/*
  # Add Payment Link Tracking to Abandoned Reservations

  1. Changes
    - Add `payment_link_sent_at` column to track when payment link was sent
    - Add `payment_link_sent` column for quick boolean check
    - Add `recovery_reservation_id` column to link to created reservation
  
  2. Security
    - No changes to RLS policies needed
*/

-- Add payment link tracking columns
ALTER TABLE abandoned_reservations 
ADD COLUMN IF NOT EXISTS payment_link_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS payment_link_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recovery_reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL;