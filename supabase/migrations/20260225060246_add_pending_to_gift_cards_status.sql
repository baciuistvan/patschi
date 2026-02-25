/*
  # Add 'pending' to gift_cards status check constraint

  ## Summary
  Adds 'pending' as a valid status value for gift cards so that cards can be
  stored in a pre-payment state while awaiting Stripe Checkout confirmation.

  ## Changes
  - Drops the existing `gift_cards_status_check` constraint
  - Re-creates it with 'pending' added alongside the existing allowed values:
    active, used, expired, cancelled

  ## Notes
  - No data is modified, only the constraint definition changes
*/

ALTER TABLE gift_cards DROP CONSTRAINT IF EXISTS gift_cards_status_check;

ALTER TABLE gift_cards
  ADD CONSTRAINT gift_cards_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'used'::text, 'expired'::text, 'cancelled'::text]));
