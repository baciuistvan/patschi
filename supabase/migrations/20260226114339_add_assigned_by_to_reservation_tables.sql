/*
  # Add assigned_by tracking to reservation_tables

  ## Summary
  Adds audit tracking to know who assigned a table to a reservation.

  ## Changes
  - `reservation_tables` table:
    - New column `assigned_by_type` (text): whether the assignment was made by an 'admin' or 'crew'
    - New column `assigned_by_id` (uuid, nullable): the UUID of the admin_users or crew_users record
    - New column `assigned_by_name` (text, nullable): denormalized display name for quick lookup without joins

  ## Notes
  - Existing rows will have NULL values for these columns (no historical data available)
  - assigned_by_name is stored alongside the ID so historical records remain readable even if users are deleted
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservation_tables' AND column_name = 'assigned_by_type'
  ) THEN
    ALTER TABLE reservation_tables ADD COLUMN assigned_by_type text CHECK (assigned_by_type IN ('admin', 'crew', 'system', 'online'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservation_tables' AND column_name = 'assigned_by_id'
  ) THEN
    ALTER TABLE reservation_tables ADD COLUMN assigned_by_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservation_tables' AND column_name = 'assigned_by_name'
  ) THEN
    ALTER TABLE reservation_tables ADD COLUMN assigned_by_name text;
  END IF;
END $$;
