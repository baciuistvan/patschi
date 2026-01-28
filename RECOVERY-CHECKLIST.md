# Gift Card Recovery Checklist

Use this checklist to track your recovery progress.

## Phase 1: Assessment

- [ ] Logged into Stripe Dashboard
- [ ] Filtered payments: Dec 11 - Today, Status = Succeeded
- [ ] Exported payment data as CSV
- [ ] Counted total gift card purchases: _____ purchases
- [ ] Checked Supabase database for existing gift cards
- [ ] Identified missing gift cards: _____ missing
- [ ] Created tracking spreadsheet with Stripe data

## Phase 2: Data Collection

For each missing gift card, collect from Stripe:
- [ ] Payment Intent ID (pi_...)
- [ ] Session ID (cs_...)
- [ ] Amount
- [ ] Recipient Name
- [ ] Recipient Email
- [ ] Purchaser Name
- [ ] Purchaser Email
- [ ] Message (if any)
- [ ] Payment Date
- [ ] Template ID (if any)

## Phase 3: Database Recovery

- [ ] Opened Supabase SQL Editor
- [ ] Reviewed recovery SQL script
- [ ] Tested recovery with one gift card first
- [ ] Verified test gift card was created correctly
- [ ] Recovered all remaining gift cards
- [ ] Verified all payment_intent_ids are in database
- [ ] Verified all payment_status = 'paid'
- [ ] Verified all status = 'active'

## Phase 4: PDF Generation

- [ ] Logged into Admin Dashboard
- [ ] Navigated to Gift Cards → Manage Gift Cards
- [ ] For each recovered gift card:
  - [ ] Gift Card 1: Generate PDF
  - [ ] Gift Card 2: Generate PDF
  - [ ] Gift Card 3: Generate PDF
  - [ ] Gift Card 4: Generate PDF
  - [ ] Gift Card 5: Generate PDF
  - [ ] (Add more rows as needed)
- [ ] Verified all PDFs are uploaded to storage
- [ ] Checked pdf_url is populated in database

## Phase 5: Email Delivery

- [ ] Verified SMTP settings in Admin Dashboard
- [ ] Tested email sending with one gift card
- [ ] Confirmed test email was received
- [ ] Sent emails for all recovered gift cards:
  - [ ] Gift Card 1: Email sent
  - [ ] Gift Card 2: Email sent
  - [ ] Gift Card 3: Email sent
  - [ ] Gift Card 4: Email sent
  - [ ] Gift Card 5: Email sent
  - [ ] (Add more rows as needed)
- [ ] Checked for email delivery errors
- [ ] Resent any failed emails

## Phase 6: Customer Communication (Optional)

- [ ] Drafted apology email template
- [ ] Sent apology to affected purchasers
- [ ] Offered compensation if decided (extra validity, bonus value)
- [ ] Responded to any customer inquiries

## Phase 7: Verification

- [ ] Ran final verification SQL queries
- [ ] Confirmed all gift cards have:
  - [ ] Valid code
  - [ ] Correct amount
  - [ ] PDF generated
  - [ ] Email sent
  - [ ] Status = active
  - [ ] Payment status = paid
- [ ] Tested gift card redemption with sample code
- [ ] Checked no duplicate gift cards created

## Phase 8: Documentation

- [ ] Documented total gift cards recovered: _____
- [ ] Documented total value recovered: €_____
- [ ] Documented date range affected: Dec 11 - _____
- [ ] Created incident report
- [ ] Updated internal procedures
- [ ] Scheduled follow-up check in 1 week

## Phase 9: Prevention

- [ ] Checked Stripe webhook URL is correct
- [ ] Verified webhook events include checkout.session.completed
- [ ] Reviewed webhook failure logs in Stripe
- [ ] Fixed webhook issues (if any)
- [ ] Tested webhook with sample purchase
- [ ] Set up webhook monitoring alerts
- [ ] Set up database monitoring for pending payments
- [ ] Documented recovery procedure for future reference
- [ ] Scheduled weekly webhook health checks

## Phase 10: Final Review

- [ ] All missing gift cards recovered: _____ / _____
- [ ] All PDFs generated: _____ / _____
- [ ] All emails sent: _____ / _____
- [ ] All customers notified
- [ ] Webhook issues resolved
- [ ] Monitoring in place
- [ ] Team briefed on incident
- [ ] Recovery complete

---

## Quick Reference Numbers

| Metric | Count | Notes |
|--------|-------|-------|
| Total Stripe payments (Dec 11+) | _____ | |
| Existing gift cards in DB | _____ | |
| Missing gift cards | _____ | |
| Successfully recovered | _____ | |
| PDFs generated | _____ | |
| Emails sent | _____ | |
| Total value recovered | €_____ | |

---

## Important Contacts

- Stripe Support: _____________________
- SMTP Provider: _____________________
- System Admin: _____________________
- Customer Service: _____________________

---

**Start Date**: _____________________
**Completion Date**: _____________________
**Person Responsible**: _____________________

---

Print this checklist and check off items as you complete them.
