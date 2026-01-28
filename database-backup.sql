-- Database Backup
-- Generated: 2025-11-24
-- Reservation System Database

-- =============================================
-- SCHEMA BACKUP
-- =============================================

-- Table: admin_users
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at timestamptz DEFAULT now()
);

-- Table: rooms
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: tables
CREATE TABLE IF NOT EXISTS tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id),
  table_number text NOT NULL,
  capacity integer NOT NULL DEFAULT 4 CHECK (capacity >= 0),
  position_x integer DEFAULT 0,
  position_y integer DEFAULT 0,
  width integer DEFAULT 100,
  height integer DEFAULT 100,
  shape text DEFAULT 'rectangle' CHECK (shape IN ('rectangle', 'circle', 'square', 'halfcircle')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: reservations
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid REFERENCES tables(id),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text DEFAULT '',
  party_size integer NOT NULL CHECK (party_size > 0),
  reservation_date date NOT NULL,
  reservation_time time NOT NULL,
  duration_minutes integer DEFAULT 120,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  special_requests text DEFAULT '',
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  payment_amount numeric DEFAULT 0.00,
  payment_method text DEFAULT 'none' CHECK (payment_method IN ('stripe', 'cash', 'none')),
  stripe_payment_intent_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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
-- INDEXES
-- =============================================

-- Add indexes as needed for performance

-- =============================================
-- BACKUP COMPLETE
-- =============================================
-- Total tables: 4
-- Total rows backed up: 1
