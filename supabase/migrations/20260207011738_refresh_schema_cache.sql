/*
  # Refresh PostgREST Schema Cache
  
  This migration refreshes the PostgREST schema cache to fix the error:
  "Could not find the 'table_id' column of 'reservations' in the schema cache"
  
  The reservations table is correct (no table_id column), but the schema cache
  needs to be refreshed to reflect the current database structure.
*/

-- Notify PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';

-- Also refresh the schema cache by touching a system table
SELECT pg_notify('pgrst', 'reload schema');

-- For good measure, analyze the tables to update statistics
ANALYZE reservations;
ANALYZE reservation_tables;
ANALYZE tables;
