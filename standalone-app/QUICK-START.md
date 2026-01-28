# Quick Start Guide

Get your Après-Ski Management System running in 5 minutes!

## Step 1: Upload Files (1 minute)

Upload these files to your web server:
```
your-website.com/
├── index.html
├── admin.html
├── reservation-widget.html
└── assets/
    ├── index-BKI28GGz.js
    └── index-DHl9RX1d.css
```

## Step 2: Setup Supabase (2 minutes)

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click "New Project"
3. Name it "apres-ski-system"
4. Wait for it to initialize (~2 minutes)
5. Go to Settings > API and copy:
   - Project URL (looks like: `https://xxxxx.supabase.co`)
   - Anon key (starts with `eyJhbG...`)

## Step 3: Run Database Migrations (1 minute)

1. In Supabase, go to SQL Editor
2. Click "New Query"
3. Copy and paste the content of `migrations/20251107105233_create_reservation_system_schema.sql`
4. Click "Run"
5. Repeat for each migration file in order (by filename date)

## Step 4: Create Admin Account (1 minute)

### Option A: Via Supabase Dashboard
1. In Supabase, go to Authentication > Users
2. Click "Add user" > "Create new user"
3. Enter email and password
4. Copy the User UID
5. Go to SQL Editor and run:
```sql
INSERT INTO admin_users (user_id, email, role)
VALUES ('paste-user-uid-here', 'your-email@example.com', 'admin');
```

### Option B: Via Application
1. Open your website: `https://your-website.com/index.html`
2. Click "Configure Supabase" (first time only)
3. Paste your Supabase URL and Anon Key
4. Click "Sign Up"
5. In Supabase SQL Editor, run the INSERT query above with your user ID

## Step 5: Login and Use!

1. Go to `https://your-website.com/index.html`
2. Enter your email and password
3. You're in! Start by:
   - Creating rooms in Settings > Rooms
   - Setting booking hours in Settings > Booking Hours
   - Designing your floor plan in Floor Plan
   - Managing reservations in Reservations

## Optional: Enable Stripe Payments

1. Get Stripe keys from [stripe.com](https://stripe.com/docs/keys)
2. In your application, go to Settings > Stripe Settings
3. Enter your Publishable Key and Secret Key
4. Deploy Edge Functions (see README.md)

## Embed Widgets on Your Website

### Reservation Widget
```html
<iframe
  src="https://your-website.com/reservation-widget.html"
  width="100%"
  height="600"
  frameborder="0">
</iframe>
```

### Gift Card Widget
```html
<iframe
  src="https://your-website.com/gift-card-widget.html"
  width="100%"
  height="600"
  frameborder="0">
</iframe>
```

## Troubleshooting

### Can't login?
- Check that you added your user to `admin_users` table
- Verify email/password are correct
- Check browser console for errors

### "Configuration not found"?
- Click "Configure Supabase" button
- Enter your Supabase URL and Anon Key
- Make sure they're correct (no extra spaces)

### Tables not showing up?
- Ensure all migrations ran successfully
- Check Supabase logs for errors
- Verify RLS policies are enabled

### Need help?
1. Check README.md for detailed instructions
2. Check Supabase project logs
3. Open browser Developer Tools > Console for errors

## Next Steps

- **Customize settings**: Configure rooms, booking hours, and email templates
- **Design floor plan**: Add tables and decorative elements
- **Test reservations**: Create a test booking
- **Setup gift cards**: Create templates and test purchases
- **Add team members**: Invite staff users in User Management
- **Embed widgets**: Add booking widgets to your website

That's it! Your management system is ready to use.
