-- Sample data for testing the Après Ski Bar Reservation System
-- Run this after creating your first admin user

-- Create sample rooms
INSERT INTO rooms (name, description, is_active) VALUES
('Main Hall', 'Our spacious main dining area with mountain views', true),
('Terrace', 'Outdoor seating with fire pits and stunning alpine scenery', true),
('VIP Lounge', 'Exclusive private area for groups', true);

-- Get room IDs (you may need to adjust these based on your actual IDs)
-- For testing, you can run: SELECT id, name FROM rooms;
-- Then replace the room_id values below with actual UUIDs

-- Sample tables for Main Hall
-- Note: Replace 'MAIN_HALL_ROOM_ID' with the actual room ID
INSERT INTO tables (room_id, table_number, capacity, position_x, position_y, width, height, shape, is_active)
SELECT
    r.id,
    'T1',
    4,
    50,
    50,
    100,
    100,
    'square',
    true
FROM rooms r WHERE r.name = 'Main Hall';

INSERT INTO tables (room_id, table_number, capacity, position_x, position_y, width, height, shape, is_active)
SELECT
    r.id,
    'T2',
    4,
    200,
    50,
    100,
    100,
    'square',
    true
FROM rooms r WHERE r.name = 'Main Hall';

INSERT INTO tables (room_id, table_number, capacity, position_x, position_y, width, height, shape, is_active)
SELECT
    r.id,
    'T3',
    6,
    350,
    50,
    120,
    120,
    'rectangle',
    true
FROM rooms r WHERE r.name = 'Main Hall';

INSERT INTO tables (room_id, table_number, capacity, position_x, position_y, width, height, shape, is_active)
SELECT
    r.id,
    'T4',
    2,
    50,
    200,
    80,
    80,
    'circle',
    true
FROM rooms r WHERE r.name = 'Main Hall';

INSERT INTO tables (room_id, table_number, capacity, position_x, position_y, width, height, shape, is_active)
SELECT
    r.id,
    'T5',
    8,
    200,
    200,
    150,
    150,
    'rectangle',
    true
FROM rooms r WHERE r.name = 'Main Hall';

-- Sample tables for Terrace
INSERT INTO tables (room_id, table_number, capacity, position_x, position_y, width, height, shape, is_active)
SELECT
    r.id,
    'TR1',
    4,
    50,
    50,
    100,
    100,
    'square',
    true
FROM rooms r WHERE r.name = 'Terrace';

INSERT INTO tables (room_id, table_number, capacity, position_x, position_y, width, height, shape, is_active)
SELECT
    r.id,
    'TR2',
    4,
    200,
    50,
    100,
    100,
    'square',
    true
FROM rooms r WHERE r.name = 'Terrace';

INSERT INTO tables (room_id, table_number, capacity, position_x, position_y, width, height, shape, is_active)
SELECT
    r.id,
    'TR3',
    6,
    350,
    50,
    120,
    120,
    'circle',
    true
FROM rooms r WHERE r.name = 'Terrace';

-- Sample tables for VIP Lounge
INSERT INTO tables (room_id, table_number, capacity, position_x, position_y, width, height, shape, is_active)
SELECT
    r.id,
    'VIP1',
    8,
    100,
    100,
    150,
    150,
    'rectangle',
    true
FROM rooms r WHERE r.name = 'VIP Lounge';

INSERT INTO tables (room_id, table_number, capacity, position_x, position_y, width, height, shape, is_active)
SELECT
    r.id,
    'VIP2',
    10,
    300,
    100,
    180,
    150,
    'rectangle',
    true
FROM rooms r WHERE r.name = 'VIP Lounge';

-- Sample reservations (upcoming dates - adjust as needed)
-- Note: These use subqueries to get table IDs dynamically
INSERT INTO reservations (
    table_id,
    customer_name,
    customer_email,
    customer_phone,
    party_size,
    reservation_date,
    reservation_time,
    duration_minutes,
    status,
    special_requests,
    payment_status,
    payment_amount
)
SELECT
    t.id,
    'John Smith',
    'john.smith@email.com',
    '+1 555-0101',
    4,
    CURRENT_DATE + INTERVAL '1 day',
    '19:00',
    120,
    'confirmed',
    'Window seat preferred',
    'paid',
    20.00
FROM tables t WHERE t.table_number = 'T1' LIMIT 1;

INSERT INTO reservations (
    table_id,
    customer_name,
    customer_email,
    customer_phone,
    party_size,
    reservation_date,
    reservation_time,
    duration_minutes,
    status,
    special_requests,
    payment_status,
    payment_amount
)
SELECT
    t.id,
    'Emma Johnson',
    'emma.j@email.com',
    '+1 555-0102',
    2,
    CURRENT_DATE,
    '20:00',
    120,
    'confirmed',
    'Celebrating anniversary',
    'paid',
    20.00
FROM tables t WHERE t.table_number = 'T4' LIMIT 1;

INSERT INTO reservations (
    table_id,
    customer_name,
    customer_email,
    customer_phone,
    party_size,
    reservation_date,
    reservation_time,
    duration_minutes,
    status,
    special_requests,
    payment_status,
    payment_amount
)
SELECT
    t.id,
    'Michael Brown',
    'michael.brown@email.com',
    '+1 555-0103',
    6,
    CURRENT_DATE + INTERVAL '2 days',
    '18:30',
    120,
    'pending',
    'Gluten-free options needed',
    'unpaid',
    20.00
FROM tables t WHERE t.table_number = 'T3' LIMIT 1;

INSERT INTO reservations (
    table_id,
    customer_name,
    customer_email,
    customer_phone,
    party_size,
    reservation_date,
    reservation_time,
    duration_minutes,
    status,
    special_requests,
    payment_status,
    payment_amount
)
SELECT
    t.id,
    'Sarah Wilson',
    'sarah.w@email.com',
    '+1 555-0104',
    8,
    CURRENT_DATE + INTERVAL '3 days',
    '19:30',
    120,
    'confirmed',
    'Birthday celebration - need dessert menu',
    'paid',
    20.00
FROM tables t WHERE t.table_number = 'VIP1' LIMIT 1;

INSERT INTO reservations (
    table_id,
    customer_name,
    customer_email,
    customer_phone,
    party_size,
    reservation_date,
    reservation_time,
    duration_minutes,
    status,
    special_requests,
    payment_status,
    payment_amount
)
SELECT
    t.id,
    'David Martinez',
    'david.m@email.com',
    '+1 555-0105',
    4,
    CURRENT_DATE,
    '21:00',
    120,
    'confirmed',
    '',
    'paid',
    20.00
FROM tables t WHERE t.table_number = 'TR2' LIMIT 1;
