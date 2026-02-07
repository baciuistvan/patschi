/*
  # Force Complete Schema Reload
  
  This migration forces a complete PostgREST schema reload by making
  a temporary schema change (add/drop column) which guarantees the cache is cleared.
*/

-- Add a temporary dummy column to force schema reload
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS _temp_cache_bust timestamp;

-- Immediately drop it
ALTER TABLE reservations DROP COLUMN IF EXISTS _temp_cache_bust;

-- Do the same for reservation_tables
ALTER TABLE reservation_tables ADD COLUMN IF NOT EXISTS _temp_cache_bust timestamp;
ALTER TABLE reservation_tables DROP COLUMN IF EXISTS _temp_cache_bust;

-- Send reload notifications
SELECT pg_notify('pgrst', 'reload schema');
SELECT pg_notify('pgrst', 'reload config');

-- Update statistics
ANALYZE reservations;
ANALYZE reservation_tables;
