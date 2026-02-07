/*
  # Force PostgREST Schema Cache Reload v2
  
  Forces PostgREST to completely reload its schema cache by making harmless
  schema changes.
*/

-- Update table comments to force schema reload
COMMENT ON TABLE reservations IS 'Customer reservations - NO table_id column - uses reservation_tables junction table';
COMMENT ON TABLE reservation_tables IS 'Junction table linking reservations to tables via table_id and reservation_id';
COMMENT ON TABLE tables IS 'Available tables for reservations';

-- Drop and recreate the schema cache notification
DO $$
BEGIN
  -- Force PostgREST to reload by sending multiple notifications
  PERFORM pg_notify('pgrst', 'reload schema');
  PERFORM pg_notify('pgrst', 'reload config');
  
  -- Wait a moment
  PERFORM pg_sleep(0.1);
  
  -- Send again to ensure it's received
  PERFORM pg_notify('pgrst', 'reload schema');
END $$;

-- Update the statistics for the tables
ANALYZE reservations;
ANALYZE reservation_tables;
ANALYZE tables;
