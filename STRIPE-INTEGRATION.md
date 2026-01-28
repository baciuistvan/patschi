# Stripe Payment Integration Guide

The reservation system is designed to integrate with Stripe for payment processing. Currently, reservations are created with payment tracking fields, but the actual Stripe payment flow needs to be configured.

## Current Payment Flow

Right now, the system:
1. ✅ Tracks payment status (unpaid, paid, refunded)
2. ✅ Records deposit amounts (default €350)
3. ✅ Stores Stripe Payment Intent IDs
4. ✅ Displays payment information in admin dashboard
5. ⏸️ **Needs**: Actual Stripe payment processing

## Setting Up Stripe

### Step 1: Create Stripe Account

1. Go to https://dashboard.stripe.com/register
2. Complete the registration process
3. Verify your business information

### Step 2: Get Your API Keys

1. Navigate to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable key** (starts with `pk_`)
3. Copy your **Secret key** (starts with `sk_`)

### Step 3: Configure Environment Variables

Add to your `.env` file:

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
```

You'll also need to add the secret key as an environment variable for your Edge Function.

### Step 4: Install Stripe Libraries

```bash
npm install @stripe/stripe-js
```

## Implementation Guide

### Frontend Integration (ReservationWidget.tsx)

The payment should be integrated at Step 4 of the reservation widget. Here's the recommended approach:

```typescript
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// In your handleSubmit function:
const handleSubmit = async () => {
  setLoading(true);
  setError('');

  try {
    // 1. Create Payment Intent via Edge Function
    const paymentIntentResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: formData.payment_amount * 100, // Convert to cents
          currency: 'eur',
          metadata: {
            customer_name: formData.customer_name,
            customer_email: formData.customer_email,
            reservation_date: formData.reservation_date,
            reservation_time: formData.reservation_time,
          },
        }),
      }
    );

    const { clientSecret } = await paymentIntentResponse.json();

    // 2. Confirm payment with Stripe
    const stripe = await stripePromise;
    const { error: stripeError, paymentIntent } = await stripe!.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: cardElement, // You'll need to add Stripe Elements
          billing_details: {
            name: formData.customer_name,
            email: formData.customer_email,
          },
        },
      }
    );

    if (stripeError) {
      throw new Error(stripeError.message);
    }

    // 3. Create reservation with payment confirmation
    const reservationData = {
      // ... existing reservation data
      payment_status: 'paid',
      stripe_payment_intent_id: paymentIntent.id,
    };

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-reservation`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reservationData),
    });

    if (!response.ok) {
      throw new Error('Failed to create reservation');
    }

    setSuccess(true);
  } catch (err) {
    setError(err.message || 'Payment failed. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

### Backend Integration (Edge Function)

Create a new Edge Function `create-payment-intent`:

```typescript
import Stripe from 'npm:stripe@latest';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { amount, currency, metadata } = await req.json();

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    );
  }
});
```

## Adding Stripe Elements UI

You'll need to add Stripe Elements for card input in the payment step:

```typescript
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Wrap your payment form with Elements provider
<Elements stripe={stripePromise}>
  <PaymentForm />
</Elements>

// In your payment form component:
const PaymentForm = () => {
  const stripe = useStripe();
  const elements = useElements();

  return (
    <div className="space-y-4">
      <div className="p-4 border border-slate-300 rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#1e293b',
                '::placeholder': {
                  color: '#94a3b8',
                },
              },
            },
          }}
        />
      </div>
      <button onClick={handlePayment}>
        Pay €{formData.payment_amount}
      </button>
    </div>
  );
};
```

## Webhook Integration (For Production)

For production, you should set up webhooks to handle payment confirmations:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-app.com/functions/v1/stripe-webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy the webhook signing secret

Create a webhook handler Edge Function:

```typescript
import Stripe from 'npm:stripe@latest';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

Deno.serve(async (req: Request) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;

      // Update reservation payment status
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      await supabase
        .from('reservations')
        .update({ payment_status: 'paid' })
        .eq('stripe_payment_intent_id', paymentIntent.id);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});
```

## Testing

### Test Mode

Stripe provides test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

Use any future expiry date, any 3-digit CVC, and any ZIP code.

### Test in Dashboard

1. Make a test reservation with test card
2. Check Stripe Dashboard → Payments to see the transaction
3. Verify the reservation shows "paid" status in your admin dashboard

## Security Best Practices

1. ✅ Never expose secret keys in frontend code
2. ✅ Always use HTTPS in production
3. ✅ Validate amounts on the server side
4. ✅ Use webhook signatures to verify events
5. ✅ Implement idempotency keys for API calls
6. ✅ Store minimal payment data (only Payment Intent IDs)

## Going Live

When ready for production:

1. Complete Stripe account activation
2. Switch from test keys to live keys
3. Update environment variables
4. Test with real card (small amount)
5. Set up production webhook endpoints
6. Monitor Stripe Dashboard for issues

## Support Resources

- Stripe Documentation: https://stripe.com/docs
- Stripe Setup Guide: https://bolt.new/setup/stripe
- Test Cards: https://stripe.com/docs/testing
- Stripe Support: Available through dashboard

## Current Status

- ✅ Database schema supports payment tracking
- ✅ Admin dashboard displays payment information
- ✅ Reservation widget UI ready for payment step
- ⏸️ **Pending**: Stripe API integration implementation
- ⏸️ **Pending**: Payment Intent Edge Function
- ⏸️ **Pending**: Webhook handler

The foundation is complete and ready for Stripe integration when you're ready to set it up!
