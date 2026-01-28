# Gift Card Recovery - One Page Summary

## THE PROBLEM
Stripe webhook failures since **December 11, 2025** mean customers paid but didn't receive gift cards.

## THE SOLUTION
Recover missing gift cards, generate PDFs, send emails, fix webhook.

---

## IMMEDIATE ACTION (5 Minutes)

### 1. Check Stripe
- Go to: https://dashboard.stripe.com/payments
- Filter: Dec 11 - Today, Status = Succeeded
- Count gift card payments: _____ payments

### 2. Check Database
```sql
SELECT COUNT(*) FROM gift_cards WHERE created_at >= '2025-12-11';
```
Result: _____ gift cards

### 3. Calculate Missing
**Missing Gift Cards** = Stripe Payments - Database Count = _____

---

## RECOVERY PROCESS

### Step 1: Get Stripe Data (15 min)
For each missing gift card, collect from Stripe Dashboard:
- Payment Intent ID (pi_...)
- Session ID (cs_...)
- Amount, Recipient Email, Purchaser Email
- Message, Payment Date

### Step 2: Run Recovery SQL (5 min per card)
```sql
-- In Supabase SQL Editor, modify and run:
-- See gift-card-recovery.sql for complete template

INSERT INTO gift_cards (code, barcode, original_amount, ...)
VALUES ('GS-XXX', '12345...', 50.00, ...);
```

### Step 3: Generate PDFs (2 min per card)
- Admin Dashboard → Gift Cards
- Find recovered card → Click "Generate PDF"

### Step 4: Send Emails (1 min per card)
- Same location → Click "Send Email"

---

## VERIFICATION

```sql
-- Run in Supabase to verify recovery
SELECT COUNT(*) as recovered,
       COUNT(CASE WHEN pdf_url IS NOT NULL THEN 1 END) as with_pdf
FROM gift_cards
WHERE created_at >= '2025-12-11' AND payment_status = 'paid';
```

Expected: recovered = Stripe payment count, with_pdf = recovered

---

## FIX WEBHOOK (20 min)

### Verify in Stripe Dashboard:
1. Developers → Webhooks
2. Check URL: `https://qwwerwkekvmaswusvgxy.supabase.co/functions/v1/handle-payment-link-webhook`
3. Verify `checkout.session.completed` is enabled
4. Test with sample purchase

---

## DETAILED GUIDES

| If you have... | Use this file... |
|----------------|------------------|
| Just learned about issue | `RECOVERY-QUICK-START.md` |
| 1-5 missing cards | `RECOVERY-QUICK-START.md` |
| 6+ missing cards | `GIFT-CARD-RECOVERY-GUIDE.md` |
| Need to track progress | `RECOVERY-CHECKLIST.md` |
| Need to match Stripe data | `stripe-database-comparison.md` |

---

## QUICK COMMANDS

### Health Check
```sql
\i check-gift-card-status.sql
```

### Find Missing PDFs
```sql
SELECT id, code, recipient_email FROM gift_cards
WHERE pdf_url IS NULL AND payment_status = 'paid'
AND created_at >= '2025-12-11';
```

### Check Specific Payment
```sql
SELECT * FROM gift_cards
WHERE stripe_payment_intent_id = 'pi_PASTE_HERE';
```

---

## TIMELINE ESTIMATE

| Cards | Time Required |
|-------|---------------|
| 1-5   | 1 hour        |
| 6-10  | 2 hours       |
| 11-20 | 3-4 hours     |
| 20+   | Half day      |

---

## PREVENTION

- [ ] Fix webhook URL
- [ ] Test with sample purchase
- [ ] Set up webhook monitoring
- [ ] Schedule weekly health checks
- [ ] Document incident

---

## EMERGENCY CONTACTS

Stripe Dashboard: https://dashboard.stripe.com
Supabase Dashboard: https://supabase.com/dashboard
Admin Panel: _____________________
Support Email: _____________________

---

## STATUS TRACKING

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Missing cards identified | _____ | _____ | ☐ |
| Cards recovered | _____ | _____ | ☐ |
| PDFs generated | _____ | _____ | ☐ |
| Emails sent | _____ | _____ | ☐ |
| Webhook fixed | 1 | _____ | ☐ |

---

**Start Now**: Run `check-gift-card-status.sql` in Supabase SQL Editor

**Get Help**: See `RECOVERY-README.md` for complete documentation
