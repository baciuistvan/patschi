/*
  # Add room_id to reservations table

  ## Summary
  Adds a `room_id` foreign key column to the `reservations` table so that each
  reservation explicitly tracks which room (Lokal or Terrasse) was selected by
  the guest. Previously this column was missing, causing the system to fall back
  to auto-selecting a table from any room — which could assign the wrong room's
  table even when the guest had chosen a specific area.

  ## Changes
  - `reservations`: new nullable `room_id` uuid column referencing `rooms(id)`
  - Existing reservations are backfilled: room_id is derived from the room of
    their linked table in `reservation_tables`
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'room_id'
  ) THEN
    ALTER TABLE reservations ADD COLUMN room_id uuid REFERENCES rooms(id);
  END IF;
END $$;

-- Backfill existing reservations from their linked table's room
UPDATE reservations r
SET room_id = t.room_id
FROM reservation_tables rt
JOIN tables t ON t.id = rt.table_id
WHERE rt.reservation_id = r.id
  AND r.room_id IS NULL;
