-- Database Backup from glufkrujejdfdwzkwsbl.supabase.co
-- Generated: 2025-11-25
-- Reservation System Database

-- =============================================
-- DATA BACKUP
-- =============================================

-- Data for admin_users (1 row)
INSERT INTO admin_users (id, email, full_name, role, created_at) VALUES
('83f2a4bf-ed6e-404a-90c9-f1753e9b7070', 'baciu@live.com', 'Admin User', 'admin', '2025-11-24 11:40:45.494423+00:00')
ON CONFLICT (id) DO NOTHING;

-- Data for rooms (0 rows)
-- No data to backup

-- Data for tables (0 rows)
-- No data to backup

-- Data for reservations (0 rows)
-- No data to backup

-- =============================================
-- BACKUP COMPLETE
-- =============================================
-- Total tables: 4
-- Total rows backed up: 1
