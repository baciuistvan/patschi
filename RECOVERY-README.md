# Gift Card Recovery Tools - Complete Guide

## Overview

Your Stripe webhook for gift card processing has been experiencing failures since **December 11, 2025**. This means some customers successfully paid for gift cards but the gift cards were never created in your database and no emails were sent.

This recovery toolkit helps you:
1. Identify all affected purchases
2. Recover missing gift card records
3. Generate PDFs and send emails to customers
4. Verify everything is working correctly
5. Prevent future occurrences

## What Happened?

When a customer buys a gift card:
1. They pay via Stripe Checkout
2. Stripe sends a `checkout.session.completed` webhook to your system
3. Your system creates the gift card record
4. PDF is generated
5. Email is sent to recipient

**The Problem**: The webhook at step 2 has been failing, so steps 3-5 never happened for some purchases.

**The Impact**: Customers paid but didn't receive their gift cards.

## Quick Start

**If you just want to get started immediately:**

1. Read: [`RECOVERY-QUICK-START.md`](./RECOVERY-QUICK-START.md) (5 minutes)
2. Run: [`check-gift-card-status.sql`](./check-gift-card-status.sql) in Supabase
3. If issues found, follow: [`GIFT-CARD-RECOVERY-GUIDE.md`](./GIFT-CARD-RECOVERY-GUIDE.md)

## Recovery Tools

### 📋 Documentation

| File | Purpose | When to Use |
|------|---------|-------------|
| `RECOVERY-QUICK-START.md` | **Start here!** Quick 5-minute overview | First time reviewing the issue |
| `GIFT-CARD-RECOVERY-GUIDE.md` | Complete step-by-step recovery process | When you're ready to recover gift cards |
| `RECOVERY-CHECKLIST.md` | Printable checklist to track progress | Throughout the recovery process |
| `stripe-database-comparison.md` | Template for comparing Stripe vs Database | When matching payments to records |
| `STRIPE-WEBHOOK-SETUP.md` | Webhook configuration guide | After recovery to prevent recurrence |

### 🛠️ SQL Scripts

| File | Purpose | When to Use |
|------|---------|-------------|
| `check-gift-card-status.sql` | **Run this first!** Complete health check | To assess the situation |
| `gift-card-recovery.sql` | Recovery scripts and templates | To recover missing gift cards |

## Step-by-Step Recovery Process

### Phase 1: Assessment (15 minutes)

1. **Check Current Status**
   ```bash
   # Run in Supabase SQL Editor
   check-gift-card-status.sql
   ```

2. **Identify Missing Gift Cards**
   - Compare Stripe payments with database records
   - Use `stripe-database-comparison.md` as a guide

3. **Document the Scope**
   - How many gift cards are missing?
   - What's the total value?
   - Who is affected?

### Phase 2: Recovery (30 minutes - 2 hours depending on count)

1. **For 1-5 Missing Gift Cards**
   - Use `RECOVERY-QUICK-START.md`
   - Manual recovery via SQL script

2. **For 6+ Missing Gift Cards**
   - Use `GIFT-CARD-RECOVERY-GUIDE.md`
   - Bulk recovery process

3. **Track Progress**
   - Use `RECOVERY-CHECKLIST.md`
   - Check off items as you complete them

### Phase 3: Fulfillment (20 minutes)

1. **Generate PDFs**
   - Admin Dashboard → Gift Cards
   - Click "Generate PDF" for each recovered card

2. **Send Emails**
   - Same location
   - Click "Send Email" for each card

3. **Verify Delivery**
   - Check email logs
   - Confirm recipients received emails

### Phase 4: Prevention (30 minutes)

1. **Fix Webhook Issues**
   - Follow `STRIPE-WEBHOOK-SETUP.md`
   - Verify webhook URL is correct
   - Test with sample purchase

2. **Set Up Monitoring**
   - Create alerts for webhook failures
   - Schedule weekly health checks
   - Monitor gift card creation rate

## File Details

### RECOVERY-QUICK-START.md
- **Time to read**: 5 minutes
- **Best for**: Quick overview and immediate action
- **Contains**:
  - 5-minute quick check process
  - Quick manual recovery for 1-5 cards
  - Where to find Stripe data
  - After recovery steps

### GIFT-CARD-RECOVERY-GUIDE.md
- **Time to complete**: 1-3 hours
- **Best for**: Complete recovery process
- **Contains**:
  - Detailed audit process
  - Database checking queries
  - Manual recovery procedures
  - Bulk recovery methods
  - PDF generation steps
  - Email sending procedures
  - Verification checklist
  - Prevention measures

### check-gift-card-status.sql
- **Time to run**: 30 seconds
- **Best for**: Getting complete system overview
- **Contains**:
  - Overall statistics
  - Payment status breakdown
  - PDF generation status
  - Daily creation rate
  - Issue detection
  - Health score
  - Action items
  - Recommended next steps

### gift-card-recovery.sql
- **Time to use**: Variable
- **Best for**: Actually recovering the gift cards
- **Contains**:
  - Audit queries
  - Individual recovery template
  - Bulk recovery scripts
  - Verification queries
  - Detailed examples

### RECOVERY-CHECKLIST.md
- **Time to complete**: Throughout recovery process
- **Best for**: Tracking your progress
- **Contains**:
  - Printable checklist
  - 10 phases of recovery
  - Checkboxes for each step
  - Quick reference numbers
  - Contact information section

### stripe-database-comparison.md
- **Time to complete**: 30-60 minutes
- **Best for**: Systematically matching Stripe to database
- **Contains**:
  - Comparison spreadsheet template
  - Step-by-step comparison process
  - Quick comparison queries
  - Bulk comparison method
  - Examples and tips

## Common Scenarios

### Scenario 1: "I just learned about this issue"
1. Read `RECOVERY-QUICK-START.md`
2. Run `check-gift-card-status.sql`
3. Assess scope of problem

### Scenario 2: "I have 1-3 missing gift cards"
1. Use Quick Manual Recovery in `RECOVERY-QUICK-START.md`
2. Generate PDFs via Admin Dashboard
3. Send emails via Admin Dashboard

### Scenario 3: "I have 5-20 missing gift cards"
1. Follow `GIFT-CARD-RECOVERY-GUIDE.md`
2. Use `gift-card-recovery.sql` individual recovery template
3. Use `RECOVERY-CHECKLIST.md` to track progress

### Scenario 4: "I have 20+ missing gift cards"
1. Follow `GIFT-CARD-RECOVERY-GUIDE.md`
2. Use bulk recovery in `gift-card-recovery.sql`
3. Use `stripe-database-comparison.md` for systematic matching
4. Use `RECOVERY-CHECKLIST.md` to track progress

### Scenario 5: "I'm not sure if I have missing gift cards"
1. Run `check-gift-card-status.sql`
2. Check the "Health Score" section
3. Review "Action Items" section
4. If issues found, proceed to recovery

## Key SQL Queries

### Check if a specific payment was fulfilled
```sql
SELECT * FROM gift_cards
WHERE stripe_payment_intent_id = 'pi_YOUR_PAYMENT_INTENT';
```

### Count gift cards since Dec 11
```sql
SELECT COUNT(*) FROM gift_cards
WHERE created_at >= '2025-12-11';
```

### Find gift cards missing PDFs
```sql
SELECT * FROM gift_cards
WHERE pdf_url IS NULL
  AND payment_status = 'paid'
  AND created_at >= '2025-12-11';
```

### System health check
```sql
-- Run the complete check-gift-card-status.sql file
```

## Support Resources

### Stripe Resources
- **Dashboard**: https://dashboard.stripe.com
- **Webhook Logs**: Dashboard → Developers → Webhooks
- **Payment Logs**: Dashboard → Payments

### Supabase Resources
- **SQL Editor**: Dashboard → SQL Editor
- **Function Logs**: Dashboard → Functions
- **Storage**: Dashboard → Storage → gift-card-pdfs

### Your Admin Dashboard
- **Gift Cards**: /admin → Gift Cards
- **Settings**: /admin → Settings → Email Settings

## Important Notes

1. **Data Safety**: All recovery scripts use `INSERT` only, never `UPDATE` or `DELETE`
2. **No Duplicates**: Scripts check for existing payment_intent_id before creating
3. **Verification**: Always verify each recovery step before moving to next
4. **Testing**: Test with 1 gift card before bulk recovery
5. **Backup**: Existing gift cards are never modified

## Timeline Estimate

| Task | Time Required |
|------|---------------|
| Initial assessment | 15 minutes |
| Stripe data export | 10 minutes |
| Database comparison | 20-40 minutes |
| Recovery (per card) | 3-5 minutes |
| PDF generation (per card) | 1-2 minutes |
| Email sending (per card) | 1 minute |
| Verification | 15 minutes |
| Webhook fix | 20 minutes |
| **Total for 10 cards** | **2-3 hours** |

## After Recovery

Once all gift cards are recovered:

1. ✓ Verify all customers received their gift cards
2. ✓ Fix webhook configuration
3. ✓ Test with new purchase
4. ✓ Set up monitoring
5. ✓ Document the incident
6. ✓ Update procedures to prevent recurrence

## Need Help?

If you encounter issues:

1. **Check Logs**
   - Stripe webhook logs
   - Supabase function logs
   - Email delivery logs

2. **Verify Configuration**
   - Webhook URL is correct
   - SMTP settings are configured
   - Storage permissions are set

3. **Test Components**
   - Make test purchase
   - Check webhook delivery
   - Verify PDF generation
   - Test email sending

4. **Review Documentation**
   - All recovery guides are detailed
   - SQL scripts have comments
   - Examples are provided

## Questions & Answers

**Q: Will recovery create duplicate gift cards?**
A: No, scripts check for existing payment_intent_id first.

**Q: What if I recover a gift card that was already sent?**
A: Check the database first - if it exists, don't recover it.

**Q: Can I recover gift cards from before Dec 11?**
A: Yes, adjust the date filter in the queries.

**Q: What if the webhook is still failing?**
A: Fix webhook first using `STRIPE-WEBHOOK-SETUP.md`, then recover.

**Q: How do I know if recovery was successful?**
A: Run `check-gift-card-status.sql` - Health Score should be "EXCELLENT".

---

## Getting Started Right Now

1. Open Supabase SQL Editor
2. Copy and paste contents of `check-gift-card-status.sql`
3. Click "Run"
4. Review the results
5. Follow the "Recommended Next Steps" in the output

**Good luck with your recovery! The tools are ready to use.**
