-- =====================================================
-- Gift Card Status Checker
-- =====================================================
-- Run this script to get a complete overview of your
-- gift card system health and identify any issues
-- =====================================================

-- =====================================================
-- SECTION 1: OVERALL STATISTICS
-- =====================================================

SELECT
  '=== OVERALL GIFT CARD STATISTICS ===' as section,
  '' as detail;

SELECT
  COUNT(*) as total_gift_cards,
  COUNT(CASE WHEN created_at >= '2025-12-11' THEN 1 END) as since_dec_11,
  SUM(original_amount) as total_value,
  SUM(current_balance) as current_balance,
  SUM(original_amount) - SUM(current_balance) as redeemed_value
FROM gift_cards;

-- =====================================================
-- SECTION 2: PAYMENT STATUS BREAKDOWN
-- =====================================================

SELECT
  '=== PAYMENT STATUS BREAKDOWN ===' as section,
  '' as detail;

SELECT
  payment_status,
  COUNT(*) as count,
  SUM(original_amount) as total_value,
  ROUND(AVG(original_amount), 2) as avg_value,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM gift_cards
WHERE created_at >= '2025-12-11'
GROUP BY payment_status
ORDER BY count DESC;

-- =====================================================
-- SECTION 3: GIFT CARD STATUS BREAKDOWN
-- =====================================================

SELECT
  '=== GIFT CARD STATUS BREAKDOWN ===' as section,
  '' as detail;

SELECT
  status,
  COUNT(*) as count,
  SUM(original_amount) as total_value
FROM gift_cards
WHERE created_at >= '2025-12-11'
GROUP BY status
ORDER BY count DESC;

-- =====================================================
-- SECTION 4: PDF GENERATION STATUS
-- =====================================================

SELECT
  '=== PDF GENERATION STATUS ===' as section,
  '' as detail;

SELECT
  CASE
    WHEN pdf_url IS NOT NULL THEN 'Has PDF'
    ELSE 'Missing PDF'
  END as pdf_status,
  COUNT(*) as count,
  SUM(original_amount) as total_value
FROM gift_cards
WHERE created_at >= '2025-12-11'
GROUP BY CASE WHEN pdf_url IS NOT NULL THEN 'Has PDF' ELSE 'Missing PDF' END;

-- =====================================================
-- SECTION 5: DAILY GIFT CARD CREATION RATE
-- =====================================================

SELECT
  '=== DAILY GIFT CARD CREATION (Since Dec 11) ===' as section,
  '' as detail;

SELECT
  date_trunc('day', created_at)::date as date,
  COUNT(*) as gift_cards_created,
  SUM(original_amount) as daily_value,
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid,
  COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN pdf_url IS NOT NULL THEN 1 END) as with_pdf
FROM gift_cards
WHERE created_at >= '2025-12-11'
GROUP BY date_trunc('day', created_at)::date
ORDER BY date DESC;

-- =====================================================
-- SECTION 6: ISSUES - PENDING PAYMENTS
-- =====================================================

SELECT
  '=== ISSUE: PENDING PAYMENTS (Over 10 minutes old) ===' as section,
  '' as detail;

SELECT
  id,
  code,
  original_amount,
  recipient_email,
  purchaser_email,
  stripe_payment_intent_id,
  stripe_session_id,
  created_at,
  EXTRACT(EPOCH FROM (now() - created_at))/60 as minutes_pending
FROM gift_cards
WHERE payment_status = 'pending'
  AND created_at < (now() - interval '10 minutes')
ORDER BY created_at;

-- If no results, show confirmation
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✓ No pending payments over 10 minutes old'
    ELSE '⚠ ' || COUNT(*) || ' gift cards with pending payments'
  END as status
FROM gift_cards
WHERE payment_status = 'pending'
  AND created_at < (now() - interval '10 minutes');

-- =====================================================
-- SECTION 7: ISSUES - MISSING PDFs
-- =====================================================

SELECT
  '=== ISSUE: MISSING PDFs (Paid gift cards without PDF) ===' as section,
  '' as detail;

SELECT
  id,
  code,
  original_amount,
  recipient_name,
  recipient_email,
  payment_status,
  created_at
FROM gift_cards
WHERE pdf_url IS NULL
  AND payment_status = 'paid'
  AND status = 'active'
  AND created_at >= '2025-12-11'
ORDER BY created_at DESC;

-- If no results, show confirmation
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✓ All paid gift cards have PDFs'
    ELSE '⚠ ' || COUNT(*) || ' paid gift cards missing PDFs'
  END as status
FROM gift_cards
WHERE pdf_url IS NULL
  AND payment_status = 'paid'
  AND status = 'active'
  AND created_at >= '2025-12-11';

-- =====================================================
-- SECTION 8: ISSUES - MISSING STRIPE DATA
-- =====================================================

SELECT
  '=== ISSUE: GIFT CARDS WITHOUT STRIPE DATA ===' as section,
  '' as detail;

SELECT
  id,
  code,
  original_amount,
  recipient_email,
  payment_status,
  created_at
FROM gift_cards
WHERE (stripe_payment_intent_id IS NULL OR stripe_session_id IS NULL)
  AND payment_status = 'paid'
  AND created_at >= '2025-12-11'
ORDER BY created_at DESC;

-- If no results, show confirmation
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN '✓ All paid gift cards have Stripe data'
    ELSE '⚠ ' || COUNT(*) || ' gift cards missing Stripe references'
  END as status
FROM gift_cards
WHERE (stripe_payment_intent_id IS NULL OR stripe_session_id IS NULL)
  AND payment_status = 'paid'
  AND created_at >= '2025-12-11';

-- =====================================================
-- SECTION 9: DUPLICATE DETECTION
-- =====================================================

SELECT
  '=== DUPLICATE DETECTION ===' as section,
  '' as detail;

-- Check for duplicate codes
SELECT
  'Duplicate Codes' as check_type,
  code,
  COUNT(*) as count
FROM gift_cards
GROUP BY code
HAVING COUNT(*) > 1;

-- Check for duplicate payment intents
SELECT
  'Duplicate Payment Intents' as check_type,
  stripe_payment_intent_id,
  COUNT(*) as count
FROM gift_cards
WHERE stripe_payment_intent_id IS NOT NULL
GROUP BY stripe_payment_intent_id
HAVING COUNT(*) > 1;

-- Confirmation if no duplicates
SELECT
  CASE
    WHEN (SELECT COUNT(*) FROM (
      SELECT code FROM gift_cards GROUP BY code HAVING COUNT(*) > 1
    ) dup) = 0
    THEN '✓ No duplicate gift card codes found'
    ELSE '⚠ Duplicate codes detected!'
  END as code_status,
  CASE
    WHEN (SELECT COUNT(*) FROM (
      SELECT stripe_payment_intent_id FROM gift_cards
      WHERE stripe_payment_intent_id IS NOT NULL
      GROUP BY stripe_payment_intent_id
      HAVING COUNT(*) > 1
    ) dup) = 0
    THEN '✓ No duplicate Stripe payment intents found'
    ELSE '⚠ Duplicate payment intents detected!'
  END as payment_intent_status;

-- =====================================================
-- SECTION 10: RECENT GIFT CARDS (Last 10)
-- =====================================================

SELECT
  '=== RECENT GIFT CARDS (Last 10) ===' as section,
  '' as detail;

SELECT
  id,
  code,
  original_amount,
  recipient_email,
  payment_status,
  CASE WHEN pdf_url IS NOT NULL THEN 'Yes' ELSE 'No' END as has_pdf,
  status,
  created_at
FROM gift_cards
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- SECTION 11: HEALTH SCORE
-- =====================================================

SELECT
  '=== SYSTEM HEALTH SCORE ===' as section,
  '' as detail;

WITH stats AS (
  SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid,
    COUNT(CASE WHEN pdf_url IS NOT NULL THEN 1 END) as with_pdf,
    COUNT(CASE WHEN payment_status = 'pending' AND created_at < (now() - interval '10 minutes') THEN 1 END) as stuck_pending
  FROM gift_cards
  WHERE created_at >= '2025-12-11'
)
SELECT
  total as total_gift_cards,
  paid as paid_count,
  ROUND((paid::numeric / NULLIF(total, 0) * 100), 1) as payment_completion_rate,
  with_pdf as pdf_count,
  ROUND((with_pdf::numeric / NULLIF(paid, 0) * 100), 1) as pdf_generation_rate,
  stuck_pending as problematic_cards,
  CASE
    WHEN stuck_pending = 0 AND (with_pdf::numeric / NULLIF(paid, 0)) >= 0.95 THEN '✓ EXCELLENT'
    WHEN stuck_pending <= 2 AND (with_pdf::numeric / NULLIF(paid, 0)) >= 0.80 THEN '⚠ GOOD'
    WHEN stuck_pending <= 5 AND (with_pdf::numeric / NULLIF(paid, 0)) >= 0.50 THEN '⚠ FAIR'
    ELSE '❌ NEEDS ATTENTION'
  END as health_status
FROM stats;

-- =====================================================
-- SECTION 12: ACTION ITEMS SUMMARY
-- =====================================================

SELECT
  '=== ACTION ITEMS ===' as section,
  '' as detail;

WITH action_items AS (
  SELECT
    COUNT(CASE WHEN payment_status = 'pending' AND created_at < (now() - interval '10 minutes') THEN 1 END) as pending_payments,
    COUNT(CASE WHEN pdf_url IS NULL AND payment_status = 'paid' AND status = 'active' THEN 1 END) as missing_pdfs,
    COUNT(CASE WHEN (stripe_payment_intent_id IS NULL OR stripe_session_id IS NULL) AND payment_status = 'paid' THEN 1 END) as missing_stripe_data
  FROM gift_cards
  WHERE created_at >= '2025-12-11'
)
SELECT
  CASE
    WHEN pending_payments > 0 THEN '❗ ' || pending_payments || ' gift cards stuck in pending status - investigate webhook'
    ELSE '✓ No pending payment issues'
  END as pending_status,
  CASE
    WHEN missing_pdfs > 0 THEN '❗ ' || missing_pdfs || ' paid gift cards need PDF generation'
    ELSE '✓ All paid gift cards have PDFs'
  END as pdf_status,
  CASE
    WHEN missing_stripe_data > 0 THEN '⚠ ' || missing_stripe_data || ' gift cards missing Stripe references'
    ELSE '✓ All gift cards properly linked to Stripe'
  END as stripe_data_status
FROM action_items;

-- =====================================================
-- SECTION 13: RECOMMENDED NEXT STEPS
-- =====================================================

SELECT
  '=== RECOMMENDED NEXT STEPS ===' as section,
  '' as detail;

WITH issues AS (
  SELECT
    COUNT(CASE WHEN payment_status = 'pending' AND created_at < (now() - interval '10 minutes') THEN 1 END) as pending,
    COUNT(CASE WHEN pdf_url IS NULL AND payment_status = 'paid' THEN 1 END) as no_pdf
  FROM gift_cards
  WHERE created_at >= '2025-12-11'
)
SELECT
  CASE
    WHEN pending > 0 THEN
      '1. Check Stripe webhook configuration' || chr(10) ||
      '2. Review webhook failure logs in Stripe Dashboard' || chr(10) ||
      '3. Verify webhook URL is correct' || chr(10) ||
      '4. Use GIFT-CARD-RECOVERY-GUIDE.md for recovery process'
    WHEN no_pdf > 0 THEN
      '1. Generate PDFs for ' || no_pdf || ' gift cards via Admin Dashboard' || chr(10) ||
      '2. Send emails to recipients after PDF generation'
    ELSE
      '✓ System is healthy! No immediate action required.' || chr(10) ||
      '  Continue monitoring webhook health.'
  END as next_steps
FROM issues;

-- =====================================================
-- END OF REPORT
-- =====================================================

SELECT
  '=== END OF HEALTH CHECK REPORT ===' as section,
  'Generated at: ' || now()::text as detail;
