-- Full Database Backup - 2025-12-02
-- Restaurant Reservation & Gift Card System
-- Complete backup with all data

-- ==============================================
-- ADMIN USERS TABLE
-- ==============================================

-- Table: admin_users (1 row)
INSERT INTO admin_users (id, email, full_name, role, created_at) VALUES
('83f2a4bf-ed6e-404a-90c9-f1753e9b7070', 'baciu@live.com', 'Istvan Baciu', 'admin', '2025-11-07 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- ROOMS TABLE
-- ==============================================

-- Table: rooms (2 rows)
INSERT INTO rooms (id, name, description, is_active, created_at, updated_at) VALUES
('acfe2227-d491-4a81-ad38-f22801433ce8', 'Local', '', true, '2025-11-07 12:21:54.682404+00', '2025-11-09 12:17:57.566805+00'),
('a13135e0-702f-4f30-91de-16eeb24ba37f', 'Terasse', '', true, '2025-11-07 12:44:53.317401+00', '2025-11-09 12:17:42.275387+00')
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- TABLES TABLE
-- ==============================================

-- Table: tables (35 rows)
INSERT INTO tables (id, room_id, table_number, capacity, position_x, position_y, width, height, shape, is_active, created_at, updated_at, rotation, custom_label, is_bookable) VALUES
('f41c5e6b-62df-4c13-9fb3-da6b8e26aa9f', 'a13135e0-702f-4f30-91de-16eeb24ba37f', '8', 6, 561, 396, 100, 180, 'rectangle', true, '2025-11-09 11:10:51.929857+00', '2025-11-09 11:37:35.289734+00', 0, null, true),
('92b740aa-1191-45da-abb9-dfdfbd8d3612', 'a13135e0-702f-4f30-91de-16eeb24ba37f', '1', 4, 547, 110, 100, 100, 'rectangle', true, '2025-11-09 11:14:33.731944+00', '2025-11-09 11:33:50.478626+00', 0, null, true),
('c152e772-dff1-447d-a52a-bd81b50128ec', 'a13135e0-702f-4f30-91de-16eeb24ba37f', '5', 8, 0, 597, 150, 150, 'rectangle', true, '2025-11-09 11:16:01.696269+00', '2025-11-09 11:36:36.846663+00', 0, null, true),
('11b10214-9113-4f96-b0ec-35af2059f635', 'a13135e0-702f-4f30-91de-16eeb24ba37f', '9', 6, 696, 395, 100, 180, 'rectangle', true, '2025-11-09 11:17:21.213093+00', '2025-11-09 11:37:41.947206+00', 0, null, true),
('0f1c427d-d518-4457-a551-63b8188b1284', 'acfe2227-d491-4a81-ad38-f22801433ce8', 'Bartisch (stehend)', 4, 587, 721, 397, 78, 'rectangle', true, '2025-11-09 12:21:16.324318+00', '2025-11-09 12:30:56.146253+00', 0, null, true),
('201911af-9bcf-4059-8b39-d449f0f6170f', 'acfe2227-d491-4a81-ad38-f22801433ce8', 'D8', 10, 4, 655, 169, 138, 'rectangle', true, '2025-11-09 12:21:45.630101+00', '2025-11-09 12:31:25.830023+00', 0, null, true),
('5c02cb74-1b65-4bfd-97dd-fa1e8229f8e5', 'acfe2227-d491-4a81-ad38-f22801433ce8', 'D7', 6, 5, 505, 97, 135, 'rectangle', true, '2025-11-09 12:21:50.169603+00', '2025-11-09 14:49:41.237215+00', 0, null, true),
('5af8d737-6e8d-4ab6-b789-291e7dacf73e', 'acfe2227-d491-4a81-ad38-f22801433ce8', 'D6', 4, 8, 359, 95, 131, 'rectangle', true, '2025-11-09 12:21:55.925296+00', '2025-11-09 12:31:57.03028+00', 0, null, true),
('b9972b52-75db-4b87-a889-9fe31cb6ef1c', 'acfe2227-d491-4a81-ad38-f22801433ce8', 'Tanztisch', 6, 254, 219, 162, 79, 'rectangle', true, '2025-11-09 12:22:14.49772+00', '2025-11-09 12:32:17.791454+00', 0, null, true),
('0facee8e-da64-4ff5-8ece-c45a995e88de', 'acfe2227-d491-4a81-ad38-f22801433ce8', 'D1', 4, 693, 6, 127, 87, 'rectangle', true, '2025-11-09 12:22:30.910834+00', '2025-11-09 12:35:11.624651+00', 0, null, true),
('61ae6e10-7993-4056-aa31-876a5da74087', 'acfe2227-d491-4a81-ad38-f22801433ce8', 'D2', 6, 463, 7, 160, 84, 'rectangle', true, '2025-11-09 12:22:35.028799+00', '2025-11-09 12:34:52.901329+00', 0, null, true),
('42f6bafd-af5e-4d55-9613-ef2c6eb45c86', 'acfe2227-d491-4a81-ad38-f22801433ce8', 'D3', 10, 233, 6, 152, 84, 'rectangle', true, '2025-11-09 12:22:39.273712+00', '2025-11-09 12:34:28.199014+00', 0, null, true),
('70b15a9c-9ee4-494a-85ed-0ac9e3d713e6', 'acfe2227-d491-4a81-ad38-f22801433ce8', 'D5', 10, 256, 141, 160, 64, 'rectangle', true, '2025-11-09 12:22:57.423294+00', '2025-11-09 12:33:39.385955+00', 0, null, true),
('0cbab1ca-f15b-49ef-85db-5b901d20b590', 'acfe2227-d491-4a81-ad38-f22801433ce8', 'D4', 10, 9, 10, 99, 178, 'rectangle', true, '2025-11-09 12:23:02.493655+00', '2025-11-09 12:34:09.917917+00', 0, null, true),
('720566a1-b951-41bf-b9f3-7b6f07c81ef8', 'acfe2227-d491-4a81-ad38-f22801433ce8', 'Bassbox', 4, 1, 217, 78, 100, 'rectangle', true, '2025-11-09 12:23:19.803423+00', '2025-11-09 12:32:35.133354+00', 0, null, true),
('34d74cb8-bb18-413b-be6c-230fa60cbb98', 'acfe2227-d491-4a81-ad38-f22801433ce8', 'R2', 3, 498, 184, 64, 59, 'circle', true, '2025-11-09 12:24:23.904557+00', '2025-11-09 12:35:19.530898+00', 0, null, true),
('ad27c384-8886-4ebf-9c93-38bbd2f5e497', 'acfe2227-d491-4a81-ad38-f22801433ce8', 'R1', 3, 633, 162, 66, 60, 'circle', true, '2025-11-09 12:24:29.948327+00', '2025-11-09 12:35:26.486041+00', 0, null, true),
('16da89e1-25b2-4220-8650-c960859269f8', 'a13135e0-702f-4f30-91de-16eeb24ba37f', 'BAR', 0, 235, -2, 913, 100, 'rectangle', false, '2025-11-09 11:54:20.242552+00', '2025-11-09 17:14:25.758568+00', 0, null, false),
('7a90af10-90f7-4d3f-a4a7-86bf62d780e3', 'acfe2227-d491-4a81-ad38-f22801433ce8', 'BAR', 0, 440, 253, 933, 351, 'circle', false, '2025-11-09 12:20:19.16309+00', '2025-11-09 17:14:25.758568+00', 0, null, false),
('07114b66-43d6-4397-bdd9-24856e7528ab', 'acfe2227-d491-4a81-ad38-f22801433ce8', '', 0, 973, 597, 331, 206, 'rectangle', false, '2025-11-09 12:28:54.469811+00', '2025-11-09 17:14:25.758568+00', 0, null, false),
('78564c3f-f742-45d8-84d6-585d4809370e', 'a13135e0-702f-4f30-91de-16eeb24ba37f', '6', 4, 310, 424, 72, 113, 'rectangle', true, '2025-11-09 11:20:36.719447+00', '2025-11-09 14:59:12.181397+00', 0, null, true),
('79f353c6-4394-4f6e-b30c-02f0e79e8a55', 'a13135e0-702f-4f30-91de-16eeb24ba37f', '', 0, 657, 96, 295, 153, 'halfcircle', false, '2025-11-09 11:54:58.834255+00', '2025-11-09 17:14:25.758568+00', 180, null, false),
('2bc31455-4430-4178-a52d-f4882632588d', 'a13135e0-702f-4f30-91de-16eeb24ba37f', '7', 6, 424, 397, 100, 180, 'square', true, '2025-11-09 09:33:54.618329+00', '2025-11-09 11:37:29.462963+00', 0, null, true),
('1b3ecb20-4106-449e-bb3b-6631494fb7b9', 'a13135e0-702f-4f30-91de-16eeb24ba37f', 'Stamm', 8, 1, 2, 147, 141, 'rectangle', true, '2025-11-09 10:02:59.302723+00', '2025-11-09 10:03:04.440959+00', 0, null, true),
('82e8e88f-a618-4fcb-a627-d8858639bece', 'a13135e0-702f-4f30-91de-16eeb24ba37f', '4', 6, 932, 259, 180, 100, 'rectangle', true, '2025-11-09 11:22:05.138294+00', '2025-11-09 11:35:30.020631+00', 0, null, true),
('2eaa6c66-d6d5-42b9-a84b-81d7bf87572e', 'a13135e0-702f-4f30-91de-16eeb24ba37f', '3', 6, 677, 262, 180, 100, 'rectangle', true, '2025-11-09 11:21:26.955128+00', '2025-11-09 11:35:20.072497+00', 0, null, true),
('0a083f71-b3c9-42a9-a964-cd17c16532f8', 'a13135e0-702f-4f30-91de-16eeb24ba37f', '2.2', 4, 549, 265, 100, 100, 'rectangle', true, '2025-11-09 11:14:22.38874+00', '2025-11-09 11:34:57.247316+00', 0, null, true),
('088f2423-913c-4a5f-9c7c-825d88e64dd5', 'a13135e0-702f-4f30-91de-16eeb24ba37f', '2.1', 4, 426, 266, 100, 100, 'rectangle', true, '2025-11-09 11:13:32.39124+00', '2025-11-09 14:58:51.117203+00', 0, null, true),
('c8c1af42-2bb0-494a-b363-31bb1b3608cb', 'a13135e0-702f-4f30-91de-16eeb24ba37f', '11', 6, 283, 613, 100, 180, 'rectangle', true, '2025-11-09 10:24:40.508957+00', '2025-11-09 14:47:31.382185+00', 0, null, false),
('42465190-1068-4b0a-b742-9c1e07a96ed2', 'a13135e0-702f-4f30-91de-16eeb24ba37f', '12', 6, 436, 615, 100, 180, 'rectangle', true, '2025-11-09 11:11:38.91128+00', '2025-11-09 14:47:29.59275+00', 0, null, false),
('bc2fda0c-dbc3-4474-835b-ad9bf774a84c', 'a13135e0-702f-4f30-91de-16eeb24ba37f', '13', 6, 593, 614, 100, 180, 'rectangle', true, '2025-11-09 11:18:08.764629+00', '2025-11-09 11:38:06.737035+00', 0, null, false),
('59317c74-7034-4386-b5c7-ade7031d250f', 'a13135e0-702f-4f30-91de-16eeb24ba37f', '14', 6, 756, 613, 100, 180, 'rectangle', true, '2025-11-09 11:18:24.877006+00', '2025-11-09 11:38:12.382713+00', 0, null, false),
('833757a7-de54-4e29-8f78-579e64b86ced', 'a13135e0-702f-4f30-91de-16eeb24ba37f', '15', 6, 916, 612, 100, 180, 'rectangle', true, '2025-11-09 11:18:40.368409+00', '2025-11-09 11:38:18.076042+00', 0, null, false),
('a325e31c-d174-4fd0-90b3-2351e5f2f9d4', 'a13135e0-702f-4f30-91de-16eeb24ba37f', '10', 6, 832, 396, 100, 180, 'rectangle', true, '2025-11-09 11:17:39.125265+00', '2025-11-09 11:37:50.346965+00', 0, null, false),
('eafc7eb4-0af7-4744-b53e-a3fcb18aa313', 'a13135e0-702f-4f30-91de-16eeb24ba37f', 'Box', 3, -62, 259, 206, 89, 'halfcircle', true, '2025-11-09 09:48:16.410154+00', '2025-11-09 11:37:02.438705+00', 90, null, false)
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- BOOKING HOURS TABLE
-- ==============================================

-- Table: booking_hours (14 rows)
INSERT INTO booking_hours (id, room_id, day_of_week, start_time, end_time, booking_interval, capacity_per_slot, is_active, created_at, updated_at) VALUES
('d326b555-044a-42d7-88ba-ced866f4ac8f', 'a13135e0-702f-4f30-91de-16eeb24ba37f', 0, '12:00:00', '23:00:00', 60, 50, true, '2025-11-09 17:02:27.152454+00', '2025-11-09 17:02:27.152454+00'),
('d20e83da-fa6d-478c-92ef-33ede2ab446f', 'a13135e0-702f-4f30-91de-16eeb24ba37f', 1, '12:00:00', '23:00:00', 60, 50, true, '2025-11-09 17:02:27.259023+00', '2025-11-09 17:02:27.259023+00'),
('da74f31e-2cdf-49cf-b59f-fbd3e4929dd8', 'a13135e0-702f-4f30-91de-16eeb24ba37f', 2, '12:00:00', '23:00:00', 60, 50, true, '2025-11-09 17:02:27.367976+00', '2025-11-09 17:02:27.367976+00'),
('f65eebfb-2fe5-416c-8225-27149137f113', 'a13135e0-702f-4f30-91de-16eeb24ba37f', 3, '12:00:00', '23:00:00', 60, 50, true, '2025-11-09 17:02:27.483226+00', '2025-11-09 17:02:27.483226+00'),
('4ab6b4da-bde1-4f91-902f-484cf952214e', 'a13135e0-702f-4f30-91de-16eeb24ba37f', 4, '12:00:00', '23:00:00', 60, 50, true, '2025-11-09 17:02:27.587426+00', '2025-11-09 17:02:27.587426+00'),
('a137c364-b358-4b65-b482-ff2ac6ad5849', 'a13135e0-702f-4f30-91de-16eeb24ba37f', 5, '12:00:00', '23:00:00', 60, 50, true, '2025-11-09 17:02:27.688487+00', '2025-11-09 17:02:27.688487+00'),
('3551b4cf-ca36-44e5-a516-68ca35295db5', 'a13135e0-702f-4f30-91de-16eeb24ba37f', 6, '12:00:00', '23:00:00', 60, 50, true, '2025-11-09 17:02:27.82404+00', '2025-11-09 17:02:27.82404+00'),
('c9732965-db3f-4a9a-a31c-5dad93820255', 'acfe2227-d491-4a81-ad38-f22801433ce8', 0, '15:45:00', '20:00:00', 90, 100, true, '2025-11-09 17:02:09.238874+00', '2025-11-09 17:02:09.238874+00'),
('7790cbf3-e9c8-41ba-acfc-7fa9128183b4', 'acfe2227-d491-4a81-ad38-f22801433ce8', 1, '15:45:00', '20:00:00', 90, 100, true, '2025-11-09 17:02:09.238874+00', '2025-11-09 17:02:09.238874+00'),
('4eab895c-228f-4a8d-9a9d-4315b4b711e9', 'acfe2227-d491-4a81-ad38-f22801433ce8', 2, '15:45:00', '20:00:00', 90, 100, true, '2025-11-09 17:02:09.238874+00', '2025-11-09 17:02:09.238874+00'),
('8f8af144-2689-4e51-9fa5-141601cd2fb7', 'acfe2227-d491-4a81-ad38-f22801433ce8', 3, '15:45:00', '20:00:00', 90, 100, true, '2025-11-09 17:02:09.238874+00', '2025-11-09 17:02:09.238874+00'),
('8e344c7f-d040-4b52-ba0b-ad83c2b25f25', 'acfe2227-d491-4a81-ad38-f22801433ce8', 4, '15:45:00', '20:00:00', 90, 100, true, '2025-11-09 17:02:09.238874+00', '2025-11-09 17:02:09.238874+00'),
('ca7a63e6-bc62-4a38-ae11-77df19b867fc', 'acfe2227-d491-4a81-ad38-f22801433ce8', 5, '15:45:00', '20:00:00', 90, 100, true, '2025-11-09 17:02:09.238874+00', '2025-11-09 17:02:09.238874+00'),
('d3a74a88-f4cd-4347-ae2d-1529ca396a9c', 'acfe2227-d491-4a81-ad38-f22801433ce8', 6, '15:45:00', '20:00:00', 90, 100, true, '2025-11-09 17:02:09.238874+00', '2025-11-09 17:02:09.238874+00')
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- SETTINGS TABLE
-- ==============================================

-- Table: settings (5 rows)
INSERT INTO settings (key, value, description, updated_at) VALUES
('deposit_amount', '350', 'Reservation deposit amount in euros (non-refundable, minimum €350)', '2025-11-07 12:31:55.463029+00'),
('email_body', 'Dear {{customer_name}},

Thank you for your reservation at our Patschi!

Reservation Details:
- Date: {{reservation_date}}
- Time: {{reservation_time}}
- Party Size: {{party_size}} guests
- Table: {{table_number}}

Special Requests: {{special_requests}}

Deposit Paid: €{{deposit_amount}}

We look forward to welcoming you!

Best regards,
The Patschi Team', 'Email body template for booking confirmation. Available variables: {{customer_name}}, {{customer_email}}, {{reservation_date}}, {{reservation_time}}, {{party_size}}, {{table_number}}, {{special_requests}}, {{deposit_amount}}', '2025-11-07 12:47:51.622214+00'),
('email_from_name', 'Patschi', 'Sender name for confirmation emails', '2025-11-07 12:47:51.622214+00'),
('email_subject', 'Reservation Confirmation - {{customer_name}}', 'Email subject line for booking confirmation', '2025-11-07 12:47:51.622214+00'),
('stripe_enabled', 'true', 'Enable or disable Stripe payment processing in the reservation widget', '2025-11-09 15:08:42.174204+00')
ON CONFLICT (key) DO NOTHING;

-- ==============================================
-- RESERVATIONS TABLE
-- ==============================================

-- Table: reservations (9 rows)
INSERT INTO reservations (id, table_id, customer_name, customer_email, customer_phone, party_size, reservation_date, reservation_time, duration_minutes, status, special_requests, payment_status, payment_amount, payment_method, stripe_payment_intent_id, created_at, updated_at, booking_method, booking_code, email_sent, email_sent_at, payment_link_id, payment_link_url) VALUES
('197e57df-c62d-4e0f-a9d9-f7122559e096', '2eaa6c66-d6d5-42b9-a84b-81d7bf87572e', 'Bert', '', '', 18, '2025-12-28', '15:45:00', 120, 'confirmed', '', 'unpaid', 0.00, 'none', null, '2025-12-01 07:43:07.987956+00', '2025-12-01 07:43:07.987956+00', 'free', '5E686712', false, null, null, null),
('c048e96d-7aac-437b-bcac-3828b5c73d88', null, 'Haxentenne', '', '', 14, '2025-12-13', '15:45:00', 120, 'confirmed', '', 'unpaid', 0.00, 'none', null, '2025-11-24 10:45:21.14924+00', '2025-11-24 10:45:21.14924+00', 'free', 'E1C87807', false, null, null, null),
('6d6d8656-a4f2-4837-8300-0c179932a271', '201911af-9bcf-4059-8b39-d449f0f6170f', 'Ralf', '', '+31645694708', 13, '2025-12-28', '15:45:00', 120, 'confirmed', '', 'unpaid', 0.00, 'none', null, '2025-11-30 13:43:09.356253+00', '2025-11-30 13:43:09.356253+00', 'free', '81C35E8D', false, null, null, null),
('9c180c16-8cbf-4a31-b9c0-57ce36c57421', null, 'Haxentenne', '', '', 14, '2025-12-12', '15:45:00', 120, 'confirmed', '', 'unpaid', 0.00, 'none', null, '2025-11-24 09:18:28.697635+00', '2025-11-24 10:45:21.414501+00', 'free', '52D7A57D', false, null, null, null),
('0f00769f-1b3b-417e-9a78-fb4b7445f028', null, 'Elisa gruppe ternig', '', '004917671206257', 50, '2025-12-07', '15:45:00', 120, 'confirmed', 'Viel deperados', 'unpaid', 0.00, 'none', null, '2025-11-30 12:30:17.244506+00', '2025-11-30 12:30:17.244506+00', 'free', 'B383B8CF', false, null, null, null),
('87de156a-9490-42e9-a043-474af9f5e30c', null, 'Elisa gruppe ternig', '', '004917671206257', 50, '2025-12-05', '15:45:00', 120, 'confirmed', 'Viel deperados', 'unpaid', 0.00, 'none', null, '2025-11-30 12:30:59.722758+00', '2025-11-30 12:30:59.722758+00', 'free', '0B42F2C8', false, null, null, null),
('80926d56-37fe-4859-899a-bc929d5e31dc', null, 'Elisa gruppe ternig', '', '004917671206257', 50, '2025-12-06', '15:45:00', 120, 'confirmed', 'Viel deperados', 'unpaid', 0.00, 'none', null, '2025-11-30 12:30:17.04607+00', '2025-11-30 12:30:17.04607+00', 'free', '044DAB94', false, null, null, null),
('c324c54d-f350-4b6a-8680-659204637518', '201911af-9bcf-4059-8b39-d449f0f6170f', 'Ralf', 'info@huh.com', '+31645694708', 13, '2026-01-01', '15:45:00', 120, 'confirmed', '', 'unpaid', 0.00, 'none', null, '2025-11-30 13:42:45.321147+00', '2025-11-30 13:42:45.321147+00', 'free', '7B75A160', false, null, null, null),
('6366a881-ec43-44b4-a822-576b4ee9a9c2', 'c8c1af42-2bb0-494a-b363-31bb1b3608cb', 'Dörthe ', 'doerthe79@googlemail.com', '+4917641264377', 19, '2025-12-31', '15:45:00', 120, 'confirmed', '', 'paid', 350.00, 'stripe', 'pi_3SZsHSIQvWRnwONv2oW5BETU', '2025-12-02 12:02:17.006531+00', '2025-12-02 12:02:17.006531+00', 'online', '3B7457E0', false, null, null, null)
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- RESERVATION_TABLES TABLE
-- ==============================================

-- Table: reservation_tables (16 rows)
INSERT INTO reservation_tables (id, reservation_id, table_id, created_at) VALUES
('78241596-0904-4f07-92c8-660fe6a47b3a', 'c048e96d-7aac-437b-bcac-3828b5c73d88', '5af8d737-6e8d-4ab6-b789-291e7dacf73e', '2025-11-24 10:45:21.290846+00'),
('0a270363-b5a6-45ba-b164-520ca831a326', 'c048e96d-7aac-437b-bcac-3828b5c73d88', '5c02cb74-1b65-4bfd-97dd-fa1e8229f8e5', '2025-11-24 10:45:21.290846+00'),
('1d78f9d5-68b7-4a3e-9ada-87d37e49c0f4', '197e57df-c62d-4e0f-a9d9-f7122559e096', '2eaa6c66-d6d5-42b9-a84b-81d7bf87572e', '2025-12-01 07:43:59.778056+00'),
('684bf78f-ed43-4da1-93ca-d1bd3edeaaf8', '6d6d8656-a4f2-4837-8300-0c179932a271', '201911af-9bcf-4059-8b39-d449f0f6170f', '2025-12-01 07:44:25.889703+00'),
('78c14c8e-3c29-4d09-8ec8-14d78420621a', 'c324c54d-f350-4b6a-8680-659204637518', '201911af-9bcf-4059-8b39-d449f0f6170f', '2025-12-01 16:06:40.724366+00'),
('fb027571-d906-46e4-b2b1-e61d51b299cb', '9c180c16-8cbf-4a31-b9c0-57ce36c57421', '5af8d737-6e8d-4ab6-b789-291e7dacf73e', '2025-11-30 11:50:54.396406+00'),
('73c21be8-ad2e-4058-9a43-7bec6d7f56e8', '9c180c16-8cbf-4a31-b9c0-57ce36c57421', '5c02cb74-1b65-4bfd-97dd-fa1e8229f8e5', '2025-11-30 11:50:54.396406+00'),
('de2ebf2d-764c-4980-8509-5a39b7ad2d20', '0f00769f-1b3b-417e-9a78-fb4b7445f028', '5af8d737-6e8d-4ab6-b789-291e7dacf73e', '2025-11-30 12:30:17.334736+00'),
('db62fd5a-c018-4211-8e6a-7457d964903d', '0f00769f-1b3b-417e-9a78-fb4b7445f028', '5c02cb74-1b65-4bfd-97dd-fa1e8229f8e5', '2025-11-30 12:30:17.334736+00'),
('5aeac42f-bbe9-44df-b080-ca200004a405', '0f00769f-1b3b-417e-9a78-fb4b7445f028', '201911af-9bcf-4059-8b39-d449f0f6170f', '2025-11-30 12:30:17.334736+00'),
('cb6c4cc3-ef5e-4a75-9d05-af98ec62cc02', '87de156a-9490-42e9-a043-474af9f5e30c', '5af8d737-6e8d-4ab6-b789-291e7dacf73e', '2025-11-30 12:30:59.82588+00'),
('5ce1c840-24a3-4d74-9556-e455c907257d', '87de156a-9490-42e9-a043-474af9f5e30c', '5c02cb74-1b65-4bfd-97dd-fa1e8229f8e5', '2025-11-30 12:30:59.82588+00'),
('ae4592af-90d5-4af5-970c-8afc95a45c4f', '87de156a-9490-42e9-a043-474af9f5e30c', '201911af-9bcf-4059-8b39-d449f0f6170f', '2025-11-30 12:30:59.82588+00'),
('4fed12f7-e4ff-4999-bf0e-4abbaf3ffea1', '80926d56-37fe-4859-899a-bc929d5e31dc', '5af8d737-6e8d-4ab6-b789-291e7dacf73e', '2025-11-30 12:31:00.113939+00'),
('a79eefbb-4bfa-4c59-88a3-a727567493d5', '80926d56-37fe-4859-899a-bc929d5e31dc', '5c02cb74-1b65-4bfd-97dd-fa1e8229f8e5', '2025-11-30 12:31:00.113939+00'),
('3d471816-ed1a-4278-b119-3c3a8b68fb9e', '80926d56-37fe-4859-899a-bc929d5e31dc', '201911af-9bcf-4059-8b39-d449f0f6170f', '2025-11-30 12:31:00.113939+00')
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- GIFT CARDS TABLE
-- ==============================================

-- Table: gift_cards (7 rows)
INSERT INTO gift_cards (id, code, original_amount, current_balance, recipient_name, recipient_email, purchaser_name, purchaser_email, message, template_id, status, stripe_payment_intent_id, purchase_date, expiry_date, pdf_url, barcode, created_at, updated_at, is_redeemed, redeemed_at, redeemed_by) VALUES
('abcfd928-2a1a-4376-a753-15c785c733fa', '3NLARR79', 10, 10, 'Istvan Baciu', 'baciu@live.com', 'Istvan Baciu', 'baciu@live.com', '', null, 'cancelled', null, '2025-12-01 16:40:09.915+00', '2026-12-01 16:40:09.915+00', null, null, '2025-12-01 16:40:10.104715+00', '2025-12-01 16:40:10.104715+00', false, null, null),
('1c8ba07e-af5f-4d26-bfd1-b3ca40e0c756', 'GC-1763238412312-Q5YCIIR', 50.00, 50.00, 'safd', 'asf@safflk.com', 'ASFklé', 'adsflk@sdkfaj.com', 'éldksf', null, 'cancelled', null, '2025-11-15 20:26:52.312+00', '2026-11-15 20:26:52.312+00', null, '1763238412312660069', '2025-11-15 20:26:52.444801+00', '2025-11-15 20:26:52.444801+00', false, null, null),
('81e39861-decb-4878-b3d5-03aa32fc56b1', 'JEBP-A6HH-MB4O-44GX', 200.00, 200.00, 'sf', 'asfd@asdf.clo', 'Istvan Baciu', 'baciu@live.com', 'adflk,m', null, 'cancelled', null, '2025-11-15 20:25:16.421803+00', '2026-11-15 20:25:16.048+00', null, '3435843894987', '2025-11-15 20:25:16.421803+00', '2025-11-15 20:25:16.421803+00', false, null, null),
('57754e15-fd0a-4ac7-a2dd-032eaafe1343', 'GC-1762854226953-D5KUQQ4', 200.00, 200.00, 'Barbara Pöttler', 'infeo@patschi.at', 'Istvan Baciu', 'baciu@live.com', 'Alles Gute!', null, 'cancelled', null, '2025-11-11 09:43:46.954+00', '2026-11-11 09:43:46.953+00', null, '1762854226953490930', '2025-11-11 09:43:47.140607+00', '2025-11-11 09:43:47.140607+00', false, null, null),
('e6567868-55f3-4112-8b10-59944a166471', 'GC-1762848939130-YMSHMGM', 100.00, 100.00, 'Stefan Patscheider', 'baciu@live.com', 'Baciu Istvan', 'baciuistan1@gmail.com', '', null, 'cancelled', null, '2025-11-11 08:15:39.13+00', '2026-11-11 08:15:39.13+00', null, '1762848939130079912', '2025-11-11 08:15:39.5447+00', '2025-11-11 08:15:39.5447+00', false, null, null),
('46946025-38d8-45cd-bb52-421261ec77b1', 'GC-1762769986263-YXV27LE', 100.00, 100.00, 'Max Mustermann', 'dhiah@daiu.hu', 'idaghik iuuhksaj', 'jdhais@hdik.hu', '', null, 'cancelled', null, '2025-11-10 10:19:46.263+00', '2026-11-10 10:19:46.263+00', null, '1762769986263496780', '2025-11-10 10:19:46.460797+00', '2025-11-10 10:19:46.460797+00', false, null, null),
('1303feb7-bf43-4c19-a97b-3d078c91f26f', 'GC-1762531552536-IT8BRWD', 100.00, 100.00, 'iuzgikv', 'igkg@fzjh.hu', 'iuzgiug', 'izgi@fvzivi.hu', '', null, 'cancelled', null, '2025-11-07 16:05:52.536+00', '2026-11-07 16:05:52.536+00', null, '1762531552536883661', '2025-11-07 16:05:52.809139+00', '2025-11-07 16:05:52.809139+00', false, null, null)
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- GIFT CARD SETTINGS TABLE
-- ==============================================

-- Table: gift_card_settings (1 row)
INSERT INTO gift_card_settings (id, minimum_amount, maximum_amount, validity_days, email_subject, email_body, terms_conditions, updated_at) VALUES
('73580529-cf47-445f-90dc-cd641e6da48e', 50.00, 1000.00, 365, 'Your Gift Card', 'Thank you for your purchase! Your gift card is attached.', '', '2025-11-07 14:08:34.651361+00')
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- BACKUP SUMMARY
-- ==============================================
-- Total Tables: 9
-- Total Rows Backed Up: 93
-- - admin_users: 1 row
-- - rooms: 2 rows
-- - tables: 35 rows
-- - booking_hours: 14 rows
-- - settings: 5 rows
-- - reservations: 9 rows
-- - reservation_tables: 16 rows
-- - gift_cards: 7 rows
-- - gift_card_settings: 1 row
-- 
-- Backup completed successfully on 2025-12-02
