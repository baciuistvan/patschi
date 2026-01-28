# Gift Card Recovery Guide

## Overview
This guide helps you recover and fulfill gift card purchases that failed during webhook processing between December 11, 2025 and today.

## Step 1: Audit Stripe Payments

### 1.1 Export Stripe Data
1. Log into your Stripe Dashboard at https://dashboard.stripe.com
2. Navigate to **Payments** → **All payments**
3. Set the date filter: **December 11, 2025** to **Today**
4. Filter by: **Status = Succeeded**
5. Look for payments with `checkout.session.completed` events
6. Click **Export** and download as CSV

### 1.2 Identify Gift Card Purchases
Gift card purchases will have these characteristics:
- Event type: `checkout.session.completed`
- Metadata field: `amount` (the gift card value)
- Metadata field: `recipient_name`
- Metadata field: `recipient_email`
- Metadata field: `purchaser_name`
- Metadata field: `purchaser_email`
- Optional metadata: `message`, `template_id`

## Step 2: Check Database for Missing Gift Cards

### 2.1 Query All Gift Cards Since Dec 11
Run this SQL in your Supabase SQL Editor:

```sql
SELECT
  id,
  code,
  original_amount,
  recipient_name,
  recipient_email,
  purchaser_name,
  purchaser_email,
  stripe_payment_intent_id,
  stripe_session_id,
  payment_status,
  status,
  purchase_date,
  created_at
FROM gift_cards
WHERE created_at >= '2025-12-11'
ORDER BY created_at DESC;
```

### 2.2 Cross-Reference with Stripe
For each successful Stripe payment:
1. Copy the `payment_intent` ID from Stripe
2. Search for it in the `stripe_payment_intent_id` column
3. If NOT found → This gift card needs recovery

### 2.3 List Missing Fulfillments
Create a spreadsheet with these columns:
- Stripe Payment Intent ID
- Stripe Session ID
- Amount
- Recipient Name
- Recipient Email
- Purchaser Name
- Purchaser Email
- Message
- Template ID
- Payment Date

## Step 3: Manually Create Missing Gift Cards

### 3.1 Use the Recovery SQL Script
For each missing gift card, use the provided SQL template below.

**IMPORTANT**: Replace the placeholder values with actual data from Stripe.

```sql
-- Gift Card Recovery Script
-- Run this for EACH missing gift card purchase

DO $$
DECLARE
  new_gift_card_id uuid;
BEGIN
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
    'GS-' || upper(substring(md5(random()::text) from 1 for 6)),  -- Generate unique code
    to_char(extract(epoch from now())::bigint, 'FM0000000000000000') || lpad(floor(random() * 1000000)::text, 6, '0'),  -- Generate barcode
    REPLACE_WITH_AMOUNT::numeric,  -- e.g., 50.00
    REPLACE_WITH_AMOUNT::numeric,  -- Same as original_amount
    'REPLACE_WITH_RECIPIENT_NAME',  -- e.g., 'Max Mustermann'
    'REPLACE_WITH_RECIPIENT_EMAIL',  -- e.g., 'max@example.com'
    'REPLACE_WITH_PURCHASER_NAME',  -- e.g., 'Anna Schmidt'
    'REPLACE_WITH_PURCHASER_EMAIL',  -- e.g., 'anna@example.com'
    'REPLACE_WITH_MESSAGE',  -- Optional message, use '' if none
    NULL,  -- template_id (or use actual UUID if you have one)
    'active',
    'paid',
    'REPLACE_WITH_PAYMENT_INTENT_ID',  -- e.g., 'pi_abc123xyz'
    'REPLACE_WITH_SESSION_ID',  -- e.g., 'cs_test_abc123'
    'REPLACE_WITH_PAYMENT_DATE'::timestamptz,  -- e.g., '2025-12-15 14:30:00+00'
    (REPLACE_WITH_PAYMENT_DATE::timestamptz + interval '1 year')  -- 1 year expiry
  )
  RETURNING id INTO new_gift_card_id;

  -- Log the recovery
  RAISE NOTICE 'Gift card recovered with ID: %', new_gift_card_id;
END $$;
```

### 3.2 Verify Each Recovery
After running each INSERT, verify it was created:

```sql
SELECT
  id,
  code,
  original_amount,
  recipient_name,
  stripe_payment_intent_id
FROM gift_cards
WHERE stripe_payment_intent_id = 'REPLACE_WITH_PAYMENT_INTENT_ID';
```

## Step 4: Generate PDFs and Send Emails

### 4.1 Call PDF Generation Function
For each recovered gift card, run this SQL to trigger PDF generation:

```sql
SELECT
  net.http_post(
    url := 'https://qwwerwkekvmaswusvgxy.supabase.co/functions/v1/generate-and-upload-gift-card-pdf',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object('giftCardId', 'REPLACE_WITH_GIFT_CARD_ID')
  ) as request_id;
```

### 4.2 Send Email to Recipient
After PDF is generated, send the email:

```sql
SELECT
  net.http_post(
    url := 'https://qwwerwkekvmaswusvgxy.supabase.co/functions/v1/send-gift-card-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object('giftCardId', 'REPLACE_WITH_GIFT_CARD_ID')
  ) as request_id;
```

**Alternative**: Use the Admin Dashboard:
1. Log into your admin panel
2. Navigate to Gift Cards → Manage Gift Cards
3. Find the recovered gift card
4. Click "Resend Email" button

## Step 5: Send Apology Emails (Optional)

Consider sending a brief apology to affected customers:

**Email Template:**

```
Subject: Your Patschi Serfaus Gift Card - Delivery Update

Dear [Customer Name],

We apologize for the delay in delivering your gift card purchased on [Date].
Due to a technical issue, some gift cards experienced a delay in processing.

Your gift card is now ready and has been sent to [recipient email].
The gift card code is: [CODE]
Value: €[AMOUNT]

Thank you for your patience and understanding. If you have any questions,
please don't hesitate to contact us.

Best regards,
Patschi Serfaus Team
```

## Step 6: Verification Checklist

After recovery, verify:
- [ ] All missing gift cards are in the database
- [ ] All `payment_status` are set to 'paid'
- [ ] All `status` are set to 'active'
- [ ] All PDFs are generated and uploaded
- [ ] All emails are sent to recipients
- [ ] All gift cards are redeemable (test with code verification)

### Verification SQL Query:
```sql
-- Check recovered gift cards
SELECT
  COUNT(*) as total_recovered,
  COUNT(CASE WHEN pdf_url IS NOT NULL THEN 1 END) as with_pdf,
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active
FROM gift_cards
WHERE created_at >= '2025-12-11'
  AND stripe_payment_intent_id IS NOT NULL;
```

## Step 7: Document the Incident

Create an internal report with:
1. Number of affected gift cards
2. Total monetary value affected
3. Date range of the issue
4. Number of customers impacted
5. Recovery completion date
6. Actions taken to prevent recurrence

## Prevention Measures

To prevent this from happening again:

1. **Monitor Webhook Health**
   - Set up Stripe webhook monitoring
   - Configure alerts for webhook failures
   - Check Stripe Dashboard → Developers → Webhooks regularly

2. **Test Webhooks Regularly**
   - Use Stripe CLI to test locally
   - Test in staging environment before production
   - Verify webhook signature validation

3. **Database Monitoring**
   - Set up alerts for gift_cards table
   - Monitor for payment_status = 'pending' older than 10 minutes
   - Create dashboard to track gift card creation rate

4. **Backup Email System**
   - Configure backup SMTP server
   - Add retry logic for failed emails
   - Log all email attempts

## Support Information

If you encounter issues during recovery:
- Check Supabase function logs for errors
- Verify SMTP configuration in Settings
- Ensure storage bucket permissions are correct
- Test PDF generation manually first

For technical support, contact your system administrator.
