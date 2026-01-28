# Stripe Test Mode Setup Complete

Your application is now configured to use Stripe test mode. Here's what has been updated:

## What Changed

1. **Environment Variables (.env)**
   - Updated `VITE_STRIPE_PUBLISHABLE_KEY` to use a test key (starts with `pk_test_`)
   - Added `VITE_STRIPE_TEST_MODE=true` flag

2. **UI Updates**
   - Added test mode indicator in Stripe Settings page
   - Added test mode banner in Reservation Widget
   - Both show the test card number for easy testing

## Important: Update Supabase Secret

You need to update the Stripe secret key in your Supabase project:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `qwwerwkekvmaswusvgxy`
3. Go to **Project Settings** → **Edge Functions** → **Secrets**
4. Find or add `STRIPE_SECRET_KEY`
5. Replace the value with your **test secret key** from Stripe (starts with `sk_test_`)
6. Save the changes

### Option 2: Using Supabase CLI

```bash
# Set the test secret key
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_TEST_SECRET_KEY_HERE
```

## Get Your Stripe Test Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click on **Developers** in the top right
3. Switch to **Test Mode** (toggle in the left sidebar)
4. Go to **API Keys**
5. Copy your test keys:
   - **Publishable key** (pk_test_...) - Already updated in `.env`
   - **Secret key** (sk_test_...) - Update this in Supabase secrets

## Testing Payments

When in test mode, use these test card numbers:

### Successful Payment
- **Card Number**: `4242 4242 4242 4242`
- **Expiry**: Any future date (e.g., `12/34`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP**: Any 5 digits (e.g., `12345`)

### Other Test Cards
- **Declined**: `4000 0000 0000 0002`
- **Insufficient Funds**: `4000 0000 0000 9995`
- **3D Secure Required**: `4000 0027 6000 3184`

Full list: https://docs.stripe.com/testing#cards

## Switching Back to Live Mode

When ready to go live:

1. Update `.env`:
   - Change `VITE_STRIPE_PUBLISHABLE_KEY` to your live key (pk_live_...)
   - Change `VITE_STRIPE_TEST_MODE=false` (or remove the line)

2. Update Supabase secret:
   - Change `STRIPE_SECRET_KEY` to your live secret key (sk_live_...)

3. Restart your application

## Verification

After updating the secret key in Supabase:

1. The test mode banner should appear at the top of the reservation form
2. The Stripe settings page should show the test mode alert
3. Try making a test reservation with card `4242 4242 4242 4242`
4. Check the Stripe dashboard (test mode) to see the payment

## Important Notes

- Test mode payments are NOT real transactions
- Test mode data is separate from live mode
- You can switch between test and live mode anytime
- Always test thoroughly before switching to live mode
- Keep your live secret keys secure and never commit them to version control
