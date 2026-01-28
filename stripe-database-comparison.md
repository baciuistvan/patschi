# Stripe vs Database Comparison Template

Use this template to identify which Stripe payments are missing from your database.

## Step 1: Export Stripe Data

1. Go to Stripe Dashboard → Payments
2. Filter: December 11, 2025 to Today, Status = Succeeded
3. Export to CSV
4. Open in Excel/Google Sheets

## Step 2: Create Comparison Spreadsheet

Create a new spreadsheet with these columns:

| Payment Intent ID | Session ID | Amount | Recipient Email | Purchaser Email | Date | In Database? | Status | Notes |
|-------------------|------------|--------|-----------------|-----------------|------|--------------|--------|-------|
| pi_abc123... | cs_test_... | 50.00 | john@example.com | jane@example.com | 2025-12-15 | | | |
| pi_def456... | cs_test_... | 75.00 | bob@example.com | alice@example.com | 2025-12-16 | | | |

## Step 3: Check Each Payment Intent

For each row in your Stripe export, run this query in Supabase:

```sql
SELECT
  id,
  code,
  recipient_email,
  original_amount,
  payment_status,
  created_at
FROM gift_cards
WHERE stripe_payment_intent_id = 'PASTE_PAYMENT_INTENT_HERE';
```

**If result found:**
- Mark "In Database?" column as ✓
- Mark "Status" as "OK"
- Move to next payment

**If no result found:**
- Mark "In Database?" column as ✗
- Mark "Status" as "NEEDS RECOVERY"
- Add this payment to your recovery list

## Step 4: Create Recovery List

Create a new sheet called "To Recover" with only the missing gift cards:

| # | Payment Intent | Session ID | Amount | Recipient Name | Recipient Email | Purchaser Name | Purchaser Email | Message | Payment Date | Recovered? |
|---|---------------|------------|--------|----------------|-----------------|----------------|-----------------|---------|--------------|------------|
| 1 | pi_... | cs_... | 50 | John Doe | john@... | Jane Smith | jane@... | Happy Birthday | 2025-12-15 10:00 | |
| 2 | pi_... | cs_... | 75 | Bob J | bob@... | Alice B | alice@... | | 2025-12-16 14:30 | |

## Step 5: Quick Comparison Query

Run this to see which payment intents from a list are missing:

```sql
WITH stripe_payments AS (
  -- Paste your payment intent IDs here, one per row
  SELECT 'pi_abc123xyz' as payment_intent_id UNION ALL
  SELECT 'pi_def456uvw' UNION ALL
  SELECT 'pi_ghi789rst' UNION ALL
  SELECT 'pi_jkl012qpo'
  -- Add more rows as needed
)
SELECT
  sp.payment_intent_id,
  CASE
    WHEN gc.id IS NOT NULL THEN '✓ Found'
    ELSE '✗ MISSING - NEEDS RECOVERY'
  END as status,
  gc.code as gift_card_code,
  gc.created_at
FROM stripe_payments sp
LEFT JOIN gift_cards gc ON gc.stripe_payment_intent_id = sp.payment_intent_id
ORDER BY
  CASE WHEN gc.id IS NOT NULL THEN 1 ELSE 0 END,
  sp.payment_intent_id;
```

## Step 6: Verification Template

After recovery, use this to verify:

```sql
-- Verify specific gift cards were recovered
SELECT
  stripe_payment_intent_id,
  code,
  recipient_email,
  original_amount,
  payment_status,
  pdf_url IS NOT NULL as has_pdf,
  created_at
FROM gift_cards
WHERE stripe_payment_intent_id IN (
  'pi_recovered1',
  'pi_recovered2',
  'pi_recovered3'
  -- Add all recovered payment intents here
)
ORDER BY created_at DESC;
```

## Example Workflow

### Example: 3 Stripe Payments, 1 Missing

**Stripe Export:**
```
1. pi_abc123 - €50 - john@example.com - Dec 15
2. pi_def456 - €75 - bob@example.com - Dec 16  ← MISSING
3. pi_ghi789 - €100 - alice@example.com - Dec 17
```

**Database Check Results:**
```sql
-- Check pi_abc123
SELECT * FROM gift_cards WHERE stripe_payment_intent_id = 'pi_abc123';
-- ✓ Found: Code GS-ABC123

-- Check pi_def456
SELECT * FROM gift_cards WHERE stripe_payment_intent_id = 'pi_def456';
-- ✗ Not found - NEEDS RECOVERY

-- Check pi_ghi789
SELECT * FROM gift_cards WHERE stripe_payment_intent_id = 'pi_ghi789';
-- ✓ Found: Code GS-XYZ789
```

**Recovery Needed:**
- 1 gift card missing (pi_def456)
- €75 value
- Recipient: bob@example.com
- Date: Dec 16

**Action:**
1. Use gift-card-recovery.sql script
2. Fill in data from Stripe
3. Generate PDF via Admin Dashboard
4. Send email to bob@example.com

## Bulk Comparison Template

If you have many payments, use this approach:

### 1. Create temp table with Stripe data
```sql
CREATE TEMP TABLE stripe_payments_to_check (
  payment_intent_id text,
  amount numeric,
  recipient_email text,
  payment_date timestamptz
);

-- Insert Stripe data
INSERT INTO stripe_payments_to_check VALUES
  ('pi_abc123', 50.00, 'john@example.com', '2025-12-15 10:00:00+00'),
  ('pi_def456', 75.00, 'bob@example.com', '2025-12-16 14:30:00+00'),
  ('pi_ghi789', 100.00, 'alice@example.com', '2025-12-17 09:15:00+00');
  -- Add all your Stripe payments here
```

### 2. Find missing payments
```sql
SELECT
  sp.payment_intent_id,
  sp.amount,
  sp.recipient_email,
  sp.payment_date,
  '✗ NEEDS RECOVERY' as status
FROM stripe_payments_to_check sp
LEFT JOIN gift_cards gc ON gc.stripe_payment_intent_id = sp.payment_intent_id
WHERE gc.id IS NULL
ORDER BY sp.payment_date;
```

### 3. Find matches
```sql
SELECT
  sp.payment_intent_id,
  sp.amount,
  gc.code,
  gc.created_at,
  '✓ OK' as status
FROM stripe_payments_to_check sp
INNER JOIN gift_cards gc ON gc.stripe_payment_intent_id = sp.payment_intent_id
ORDER BY sp.payment_date;
```

### 4. Summary
```sql
SELECT
  COUNT(*) as total_stripe_payments,
  COUNT(gc.id) as found_in_database,
  COUNT(*) - COUNT(gc.id) as missing_count,
  SUM(CASE WHEN gc.id IS NULL THEN sp.amount ELSE 0 END) as missing_value
FROM stripe_payments_to_check sp
LEFT JOIN gift_cards gc ON gc.stripe_payment_intent_id = sp.payment_intent_id;
```

## Tips

1. **Start Small**: Check 5-10 payments manually first to understand the process
2. **Double Check**: Verify payment intent IDs match exactly (no extra spaces)
3. **Date Format**: Use ISO format for dates: 'YYYY-MM-DD HH:MM:SS+00'
4. **Test Recovery**: Recover one gift card first and verify it works before bulk recovery
5. **Keep Records**: Save your comparison spreadsheet for documentation

## Common Issues

**Issue**: Payment intent found but no gift card code
- **Cause**: Gift card creation failed after payment
- **Fix**: Recover using the recovery script

**Issue**: Multiple gift cards with same payment intent
- **Cause**: Duplicate recovery or webhook retry
- **Fix**: Keep the first one, delete duplicates

**Issue**: Payment intent doesn't match
- **Cause**: Typo in payment intent ID
- **Fix**: Copy-paste directly from Stripe, don't type manually

## After Comparison

Once you've identified all missing gift cards:
1. Use `gift-card-recovery.sql` to recover them
2. Use `check-gift-card-status.sql` to verify recovery
3. Follow `RECOVERY-CHECKLIST.md` to complete the process

---

**Remember**: Every successful Stripe payment should have exactly ONE corresponding gift card in your database. If counts don't match, investigate.
