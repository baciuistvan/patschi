# Gift Card Recovery - Quick Start

## Immediate Actions Required

Your Stripe webhook has been failing since December 11, 2025. Customers may have paid but not received their gift cards.

## 5-Minute Quick Check

### 1. Check Stripe Dashboard
```
1. Go to: https://dashboard.stripe.com/payments
2. Filter: Dec 11 - Today, Status = Succeeded
3. Look for payments with "Gift Card" or checkout sessions
4. Note how many gift card payments you see
```

### 2. Check Your Database
```sql
-- Run this in Supabase SQL Editor
SELECT COUNT(*) as total_gift_cards,
       SUM(original_amount) as total_value
FROM gift_cards
WHERE created_at >= '2025-12-11';
```

### 3. Compare Numbers
- Stripe successful payments: _____
- Database gift cards: _____
- **Missing gift cards = Stripe payments - Database records**

## If You Have Missing Gift Cards

### Option A: Quick Manual Recovery (1-5 missing)

For each missing gift card, run this in Supabase SQL Editor:

```sql
DO $$
DECLARE
  v_gift_card_id uuid;
  v_code text;
BEGIN
  v_code := 'GS-' || upper(substring(md5(random()::text) from 1 for 6));

  INSERT INTO gift_cards (
    code, barcode,
    original_amount, current_balance,
    recipient_name, recipient_email,
    purchaser_name, purchaser_email,
    message,
    status, payment_status,
    stripe_payment_intent_id,
    stripe_session_id,
    purchase_date, expiry_date
  ) VALUES (
    v_code,
    to_char(extract(epoch from now())::bigint, 'FM0000000000000000') || lpad(floor(random() * 1000000)::text, 6, '0'),
    50.00,  -- CHANGE THIS: Amount from Stripe
    50.00,  -- CHANGE THIS: Same amount
    'John Doe',  -- CHANGE THIS: Recipient name from Stripe
    'john@example.com',  -- CHANGE THIS: Recipient email
    'Jane Smith',  -- CHANGE THIS: Purchaser name
    'jane@example.com',  -- CHANGE THIS: Purchaser email
    '',  -- CHANGE THIS: Message if any
    'active',
    'paid',
    'pi_XXXXXXXXXX',  -- CHANGE THIS: Payment intent from Stripe
    'cs_test_XXXXXXXXXX',  -- CHANGE THIS: Session ID from Stripe
    '2025-12-15 10:00:00+00'::timestamptz,  -- CHANGE THIS: Payment date
    '2026-12-15 10:00:00+00'::timestamptz   -- CHANGE THIS: +1 year
  )
  RETURNING id INTO v_gift_card_id;

  RAISE NOTICE 'Created gift card ID: % with code: %', v_gift_card_id, v_code;
END $$;
```

Then:
1. Go to your Admin Dashboard
2. Navigate to Gift Cards → Manage Gift Cards
3. Find the gift card you just created
4. Click "Generate PDF" button
5. Click "Send Email" button

### Option B: Bulk Recovery (6+ missing)

See `GIFT-CARD-RECOVERY-GUIDE.md` for detailed instructions and `gift-card-recovery.sql` for bulk recovery scripts.

## Where to Get Stripe Data

### Find Payment Details in Stripe:
1. Go to specific payment in Stripe Dashboard
2. Click on the payment to see details
3. Find the **Metadata** section:
   - `amount`: Gift card value
   - `recipient_name`: Who receives it
   - `recipient_email`: Where to send it
   - `purchaser_name`: Who bought it
   - `purchaser_email`: Purchaser's email
   - `message`: Personal message
4. Copy the **Payment Intent ID** (starts with `pi_`)
5. Copy the **Session ID** (starts with `cs_test_` or `cs_live_`)
6. Note the **Payment Date**

## After Recovery

### 1. Generate PDFs
For each recovered gift card:
- Admin Dashboard → Gift Cards → Manage Gift Cards
- Find the card → Click "Generate PDF"

### 2. Send Emails
- Same location → Click "Send Email"

### 3. Verify
```sql
-- Check all recovered cards have PDFs and are sent
SELECT
  id,
  code,
  recipient_email,
  pdf_url IS NOT NULL as has_pdf,
  payment_status,
  status
FROM gift_cards
WHERE created_at >= '2025-12-11'
  AND payment_status = 'paid';
```

## Preventing Future Issues

### Update Webhook URL in Stripe
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. Verify the URL is correct:
   ```
   https://qwwerwkekvmaswusvgxy.supabase.co/functions/v1/handle-payment-link-webhook
   ```
4. Check that `checkout.session.completed` event is enabled
5. Check recent webhook attempts for errors

### Test Your Webhook
```bash
# Use Stripe CLI to test
stripe trigger checkout.session.completed
```

Or make a test purchase and verify:
1. Gift card appears in database immediately
2. Email is sent to recipient
3. PDF is generated

## Support

If you encounter errors:

1. **Check Supabase Function Logs**
   - Supabase Dashboard → Functions → handle-payment-link-webhook → Logs

2. **Check SMTP Configuration**
   - Admin Dashboard → Settings → Email Settings
   - Verify SMTP host, port, username, password are correct

3. **Check Storage Permissions**
   - Supabase Dashboard → Storage → gift-card-pdfs
   - Verify public read access is enabled

## Contact Information

For technical support with this recovery:
- Check the detailed guide: `GIFT-CARD-RECOVERY-GUIDE.md`
- SQL scripts: `gift-card-recovery.sql`
- Review your webhook logs in Stripe and Supabase

---

**Important**: Don't panic. The gift card data is safe in Stripe. We just need to recreate the records in your database and send the emails. Follow the steps carefully and verify each recovery.
