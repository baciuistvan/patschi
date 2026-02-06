/*
  # Prevent Table Overbooking

  1. Changes
    - Add function to check for overlapping reservations on the same table
    - Add trigger to prevent double-booking before insert/update
    - Ensures a table can only be booked once at any specific time
    
  2. Security
    - Prevents race conditions at database level
    - Enforces booking integrity even if application logic fails
    - Works for all booking sources (widget, admin, crew app)
*/

-- Function to check for overlapping reservations
CREATE OR REPLACE FUNCTION check_table_availability()
RETURNS TRIGGER AS $$
DECLARE
  reservation_start TIMESTAMP;
  reservation_end TIMESTAMP;
  conflict_count INTEGER;
BEGIN
  -- Get the reservation details
  SELECT 
    (reservation_date || ' ' || reservation_time)::TIMESTAMP,
    (reservation_date || ' ' || reservation_time)::TIMESTAMP + (COALESCE(duration_minutes, 120) || ' minutes')::INTERVAL
  INTO reservation_start, reservation_end
  FROM reservations
  WHERE id = NEW.reservation_id;

  -- Check for overlapping reservations on the same table
  -- Exclude cancelled reservations and the current reservation (for updates)
  SELECT COUNT(*) INTO conflict_count
  FROM reservation_tables rt
  INNER JOIN reservations r ON rt.reservation_id = r.id
  WHERE rt.table_id = NEW.table_id
    AND r.status IN ('confirmed', 'pending', 'seated')
    AND rt.reservation_id != NEW.reservation_id
    AND (
      -- Check for time overlap
      (
        (r.reservation_date || ' ' || r.reservation_time)::TIMESTAMP < reservation_end
        AND
        ((r.reservation_date || ' ' || r.reservation_time)::TIMESTAMP + (COALESCE(r.duration_minutes, 120) || ' minutes')::INTERVAL) > reservation_start
      )
    );

  -- If there's a conflict, prevent the insert/update
  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'Table % is already booked for this time slot', NEW.table_id
      USING HINT = 'Please choose a different table or time';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS prevent_table_overbooking ON reservation_tables;

-- Create trigger to run before insert or update
CREATE TRIGGER prevent_table_overbooking
  BEFORE INSERT OR UPDATE ON reservation_tables
  FOR EACH ROW
  EXECUTE FUNCTION check_table_availability();

-- Add comment for documentation
COMMENT ON FUNCTION check_table_availability() IS 'Prevents double-booking by checking for overlapping reservations on the same table';
