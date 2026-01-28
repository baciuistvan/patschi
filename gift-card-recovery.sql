-- =====================================================
-- Gift Card Recovery SQL Script
-- =====================================================
-- This script helps recover gift cards from failed webhook processing
-- Use with data exported from Stripe Dashboard

-- =====================================================
-- STEP 1: Audit Current State
-- =====================================================

-- Check all gift cards created since December 11, 2025
SELECT
  id,
  code,
  original_amount,
  recipient_name,
  recipient_email,
  purchaser_name,
  stripe_payment_intent_id,
  stripe_session_id,
  payment_status,
  status,
  pdf_url IS NOT NULL as has_pdf,
  purchase_date,
  created_at
FROM gift_cards
WHERE created_at >= '2025-12-11'
ORDER BY created_at DESC;

-- Count gift cards by payment status
SELECT
  payment_status,
  COUNT(*) as count,
  SUM(original_amount) as total_value
FROM gift_cards
WHERE created_at >= '2025-12-11'
GROUP BY payment_status;

-- Find gift cards without PDFs
SELECT
  id,
  code,
  recipient_email,
  original_amount,
  created_at
FROM gift_cards
WHERE pdf_url IS NULL
  AND created_at >= '2025-12-11'
ORDER BY created_at DESC;

-- =====================================================
-- STEP 2: Check for Specific Payment Intent
-- =====================================================
-- Replace 'PAYMENT_INTENT_ID' with actual Stripe payment_intent ID

-- Check if a specific payment intent exists
SELECT *
FROM gift_cards
WHERE stripe_payment_intent_id = 'PAYMENT_INTENT_ID';

-- Check if a specific session ID exists
SELECT *
FROM gift_cards
WHERE stripe_session_id = 'SESSION_ID';

-- =====================================================
-- STEP 3: Recover Individual Gift Card
-- =====================================================
-- Use this template for EACH missing gift card
-- Replace ALL placeholder values with actual data from Stripe

DO $$
DECLARE
  v_gift_card_id uuid;
  v_code text;
  v_barcode text;
BEGIN
  -- Generate unique code
  v_code := 'GS-' || upper(substring(md5(random()::text) from 1 for 6));

  -- Generate unique barcode
  v_barcode := to_char(extract(epoch from now())::bigint, 'FM0000000000000000') ||
               lpad(floor(random() * 1000000)::text, 6, '0');

  -- Insert the gift card
  INSERT INTO gift_cards (
    code,
    barcode,
    original_amount,
    current_balance,
    recipient_name,
    recipient_email,
    purchaser_name,
    purchaser_email,
    message,
    template_id,
    status,
    payment_status,
    stripe_payment_intent_id,
    stripe_session_id,
    purchase_date,
    expiry_date
  ) VALUES (
    v_code,
    v_barcode,
    50.00,  -- REPLACE: Amount from Stripe metadata
    50.00,  -- REPLACE: Same as original_amount
    'Recipient Name',  -- REPLACE: From Stripe metadata.recipient_name
    'recipient@example.com',  -- REPLACE: From Stripe metadata.recipient_email
    'Purchaser Name',  -- REPLACE: From Stripe metadata.purchaser_name
    'purchaser@example.com',  -- REPLACE: From Stripe metadata.purchaser_email
    '',  -- REPLACE: From Stripe metadata.message (use '' if empty)
    NULL,  -- REPLACE: From Stripe metadata.template_id if exists
    'active',
    'paid',
    'pi_XXXXXXXXXX',  -- REPLACE: Stripe payment_intent ID
    'cs_test_XXXXXXXXXX',  -- REPLACE: Stripe session ID
    '2025-12-15 10:00:00+00'::timestamptz,  -- REPLACE: Actual payment date from Stripe
    ('2025-12-15 10:00:00+00'::timestamptz + interval '1 year')  -- Auto-calculate expiry
  )
  RETURNING id, code INTO v_gift_card_id, v_code;

  -- Log the recovery
  RAISE NOTICE '✓ Gift card recovered successfully!';
  RAISE NOTICE '  ID: %', v_gift_card_id;
  RAISE NOTICE '  Code: %', v_code;
  RAISE NOTICE '  Barcode: %', v_barcode;

END $$;

-- =====================================================
-- STEP 4: Verify Recovery
-- =====================================================
-- After running recovery, verify the gift card was created

SELECT
  id,
  code,
  barcode,
  original_amount,
  recipient_name,
  recipient_email,
  purchaser_name,
  stripe_payment_intent_id,
  payment_status,
  status,
  purchase_date,
  expiry_date
FROM gift_cards
WHERE stripe_payment_intent_id = 'pi_XXXXXXXXXX'  -- REPLACE with actual payment intent
ORDER BY created_at DESC
LIMIT 1;

-- =====================================================
-- STEP 5: Bulk Recovery Template (Advanced)
-- =====================================================
-- Use this to recover multiple gift cards at once
-- First, create a temporary table with Stripe data

CREATE TEMP TABLE IF NOT EXISTS temp_stripe_recoveries (
  payment_intent_id text PRIMARY KEY,
  session_id text,
  amount numeric,
  recipient_name text,
  recipient_email text,
  purchaser_name text,
  purchaser_email text,
  message text,
  template_id uuid,
  payment_date timestamptz
);

-- Insert your Stripe data here (one INSERT per missing gift card)
-- Example:
/*
INSERT INTO temp_stripe_recoveries VALUES
  ('pi_abc123', 'cs_test_123', 50.00, 'John Doe', 'john@example.com', 'Jane Smith', 'jane@example.com', 'Happy Birthday!', NULL, '2025-12-15 10:00:00+00'),
  ('pi_def456', 'cs_test_456', 75.00, 'Bob Johnson', 'bob@example.com', 'Alice Brown', 'alice@example.com', '', NULL, '2025-12-16 14:30:00+00');
*/

-- Run bulk recovery (after populating temp table)
DO $$
DECLARE
  r record;
  v_code text;
  v_barcode text;
  v_count integer := 0;
BEGIN
  FOR r IN SELECT * FROM temp_stripe_recoveries LOOP
    -- Check if already exists
    IF EXISTS (SELECT 1 FROM gift_cards WHERE stripe_payment_intent_id = r.payment_intent_id) THEN
      RAISE NOTICE 'SKIP: Gift card already exists for payment_intent %', r.payment_intent_id;
      CONTINUE;
    END IF;

    -- Generate unique identifiers
    v_code := 'GS-' || upper(substring(md5(random()::text || r.payment_intent_id) from 1 for 6));
    v_barcode := to_char(extract(epoch from r.payment_date)::bigint, 'FM0000000000000000') ||
                 lpad(floor(random() * 1000000)::text, 6, '0');

    -- Insert gift card
    INSERT INTO gift_cards (
      code,
      barcode,
      original_amount,
      current_balance,
      recipient_name,
      recipient_email,
      purchaser_name,
      purchaser_email,
      message,
      template_id,
      status,
      payment_status,
      stripe_payment_intent_id,
      stripe_session_id,
      purchase_date,
      expiry_date
    ) VALUES (
      v_code,
      v_barcode,
      r.amount,
      r.amount,
      r.recipient_name,
      r.recipient_email,
      r.purchaser_name,
      r.purchaser_email,
      COALESCE(r.message, ''),
      r.template_id,
      'active',
      'paid',
      r.payment_intent_id,
      r.session_id,
      r.payment_date,
      r.payment_date + interval '1 year'
    );

    v_count := v_count + 1;
    RAISE NOTICE '✓ Recovered: % - Code: % - Amount: €%', r.recipient_name, v_code, r.amount;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total gift cards recovered: %', v_count;
END $$;

-- Clean up temp table
DROP TABLE IF EXISTS temp_stripe_recoveries;

-- =====================================================
-- STEP 6: Trigger PDF Generation for Recovered Cards
-- =====================================================
-- Get list of gift cards needing PDF generation

SELECT
  id,
  code,
  recipient_email,
  original_amount
FROM gift_cards
WHERE pdf_url IS NULL
  AND payment_status = 'paid'
  AND status = 'active'
  AND created_at >= '2025-12-11'
ORDER BY created_at;

-- For each ID above, you need to call the edge function
-- Use the Admin Dashboard or run this query to get the list:

SELECT
  'Call generate-and-upload-gift-card-pdf with ID: ' || id::text as action,
  code,
  recipient_email
FROM gift_cards
WHERE pdf_url IS NULL
  AND payment_status = 'paid'
  AND created_at >= '2025-12-11'
ORDER BY created_at;

-- =====================================================
-- STEP 7: Verification Queries
-- =====================================================

-- Summary of recovery status
SELECT
  COUNT(*) as total_gift_cards,
  COUNT(CASE WHEN pdf_url IS NOT NULL THEN 1 END) as with_pdf,
  COUNT(CASE WHEN pdf_url IS NULL THEN 1 END) as missing_pdf,
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid,
  COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending,
  SUM(original_amount) as total_value
FROM gift_cards
WHERE created_at >= '2025-12-11';

-- Find any issues
SELECT
  'Missing PDF' as issue,
  id,
  code,
  recipient_email,
  created_at
FROM gift_cards
WHERE pdf_url IS NULL
  AND payment_status = 'paid'
  AND created_at >= '2025-12-11'

UNION ALL

SELECT
  'Payment Pending' as issue,
  id,
  code,
  recipient_email,
  created_at
FROM gift_cards
WHERE payment_status = 'pending'
  AND created_at >= '2025-12-11'
  AND created_at < (now() - interval '10 minutes')

ORDER BY created_at DESC;

-- Final verification: Compare counts
-- Run this to see daily gift card creation rate
SELECT
  date_trunc('day', created_at) as day,
  COUNT(*) as gift_cards_created,
  SUM(original_amount) as total_value,
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_count,
  COUNT(CASE WHEN pdf_url IS NOT NULL THEN 1 END) as with_pdf_count
FROM gift_cards
WHERE created_at >= '2025-12-11'
GROUP BY date_trunc('day', created_at)
ORDER BY day DESC;

-- =====================================================
-- NOTES
-- =====================================================
--
-- 1. Always verify payment_intent_id doesn't already exist before inserting
-- 2. Generate unique codes using the provided formulas
-- 3. Set expiry_date to 1 year from purchase_date
-- 4. After recovery, manually trigger PDF generation via Admin Dashboard
-- 5. Send emails to recipients after PDF is ready
-- 6. Document all recovered gift cards for your records
--
-- =====================================================
