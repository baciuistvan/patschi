# Stripe Webhook Setup for Gift Cards

## The Problem
Gift cards aren't being generated because Stripe can't notify the system after payment completes.

## Solution: Configure Stripe Webhook

### Step 1: Get Your Webhook URL
Your webhook endpoint is:
```
https://qwwerwkekvmaswusvgxy.supabase.co/functions/v1/handle-payment-link-webhook
```

### Step 2: Add Webhook in Stripe Dashboard

1. **Go to Stripe Dashboard**
   - Visit: https://dashboard.stripe.com/test/webhooks

2. **Click "Add endpoint"**

3. **Enter Endpoint URL**
   ```
   https://qwwerwkekvmaswusvgxy.supabase.co/functions/v1/handle-payment-link-webhook
   ```

4. **Select Events to Listen For**
   Click "Select events" and choose:
   - `checkout.session.completed` ✓

5. **Click "Add endpoint"**

6. **Copy the Signing Secret**
   - After creating the webhook, click on it
   - You'll see "Signing secret" - click "Reveal"
   - Copy the value (starts with `whsec_`)

### Step 3: Test the Webhook

1. **Try Test Purchase**
   - Go to your gift card widget
   - Make a test purchase with test card: `4242 4242 4242 4242`
   - Use any future expiry date and any 3-digit CVC

2. **Check Stripe Dashboard**
   - Go to: https://dashboard.stripe.com/test/webhooks
   - Click on your webhook
   - You should see successful delivery events

3. **Verify Gift Card Created**
   - Check your admin dashboard
   - The gift card should appear with status "paid"
   - Email should be sent to buyer

## Optional: Add Webhook Secret (Recommended)

The webhook secret adds security verification:

1. In Supabase Dashboard, go to Project Settings → Edge Functions
2. Add environment variable:
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_...` (from Step 2.6 above)

## Testing

**Test Card Numbers:**
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`

**All test cards:**
- Expiry: Any future date (e.g., 12/34)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any 5 digits (e.g., 12345)

## What Happens After Webhook is Configured

1. ✓ User buys gift card
2. ✓ Redirected to Stripe Checkout
3. ✓ Completes payment
4. ✓ **Stripe sends webhook** to your system
5. ✓ Gift card is created in database with code
6. ✓ Email sent with PDF to buyer
7. ✓ User redirected back to success page

## Troubleshooting

### Gift cards still not generating?

1. **Check Webhook Logs**
   - Stripe Dashboard → Webhooks → Click your endpoint
   - Look for failed deliveries

2. **Check Supabase Logs**
   - Supabase Dashboard → Edge Functions → handle-payment-link-webhook
   - Check for errors

3. **Verify Event Type**
   - Make sure `checkout.session.completed` is selected

### Webhook returns errors?

Check that:
- The endpoint URL is exactly correct
- You're using TEST mode keys with TEST webhook
- The event type is `checkout.session.completed`
