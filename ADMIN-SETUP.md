# Admin Setup Guide

## Quick Start

### Step 0: Enable Email Authentication in Supabase (REQUIRED)

**IMPORTANT**: Before you can create users or log in, you must enable email authentication:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Authentication** in the left sidebar
4. Click **Providers**
5. Find **Email** in the list and click on it
6. **Toggle ON** the "Enable Email provider" switch at the top
7. Scroll down and **UNCHECK** "Confirm email" (recommended for development)
8. Click **Save**

Without this step, you will get an error: "Email logins are disabled"

### Step 1: Create Your Admin Account

Since this system uses Supabase authentication with a custom admin table, you need to:

1. **Create a Supabase Auth Account**
   - You can do this through the Supabase Dashboard → Authentication → Users
   - Click "Add user" and create a user with your email and password

2. **Get Your User ID**
   - After creating the user, copy the UUID from the Users table
   - It will look something like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

3. **Add Admin Permissions**
   Run this SQL in the Supabase SQL Editor:

   ```sql
   INSERT INTO admin_users (id, email, full_name, role)
   VALUES (
     'YOUR_USER_ID_HERE',
     'your-email@example.com',
     'Your Full Name',
     'admin'
   );
   ```

### Step 2: Load Sample Data (Optional)

To quickly test the system with sample rooms, tables, and reservations:

1. Open the Supabase SQL Editor
2. Copy and paste the contents of `seed-data.sql`
3. Execute the query

This will create:
- 3 rooms (Main Hall, Terrace, VIP Lounge)
- 10 tables across all rooms
- 5 sample reservations

### Step 3: Access the Dashboard

1. Navigate to your app URL (e.g., `https://your-app.com/`)
2. Log in with the email and password you created in Step 1
3. You should now see the admin dashboard!

## Creating Additional Staff Users

### Admin Role vs Staff Role

- **Admin**: Can create/edit/delete rooms and tables, manage all reservations
- **Staff**: Can view and manage reservations, but cannot modify room/table settings

### Adding Staff Members

1. Create a new Supabase Auth user (same as Step 1 above)
2. Add them to the admin_users table with 'staff' role:

```sql
INSERT INTO admin_users (id, email, full_name, role)
VALUES (
  'STAFF_USER_ID_HERE',
  'staff@example.com',
  'Staff Member Name',
  'staff'
);
```

## Testing the Reservation Widget

### Local Testing
Visit: `http://localhost:5173/widget`

### Production Testing
Visit: `https://your-app.com/widget`

The widget should display without requiring authentication and allow customers to:
1. Select date, time, and party size
2. Choose an available table
3. Enter their information
4. Complete the booking

## WordPress Integration

### Plugin Installation

1. Copy `wordpress-integration.php` to your WordPress installation:
   ```
   /wp-content/plugins/apreski-reservation-widget/wordpress-integration.php
   ```

2. Create a folder if needed:
   ```bash
   mkdir -p /wp-content/plugins/apreski-reservation-widget/
   ```

3. Activate the plugin:
   - Go to WordPress Admin → Plugins
   - Find "Après Ski Reservation Widget"
   - Click "Activate"

### Widget Configuration

1. Go to Appearance → Widgets
2. Find "Après Ski Reservations"
3. Drag it to your desired widget area (sidebar, footer, etc.)
4. Configure:
   - Title: "Reserve Your Table"
   - Reservation App URL: `https://your-app.com`
5. Save

### Shortcode Usage

Add to any page or post:

```
[apreski_reservations url="https://your-app.com"]
```

With custom height:

```
[apreski_reservations url="https://your-app.com" height="800px"]
```

## Customization Options

### Change Reservation Duration

Edit `src/components/ReservationWidget.tsx` line with `duration_minutes: 120`:
- Change `120` to your desired duration in minutes
- Default is 2 hours

### Change Deposit Amount

Edit `src/components/ReservationWidget.tsx`:
- Find `payment_amount: 20`
- Change to your desired deposit amount

### Change Available Hours

Edit `src/components/ReservationWidget.tsx`:
- Find: `Array.from({ length: 14 }, (_, i) => i + 11)`
- Adjust length and starting hour (currently 11:00-24:00)

### Add More Table Shapes

Currently supports: rectangle, circle, square

To add more shapes, edit:
1. Database constraint in migration file
2. `src/lib/supabase.ts` type definition
3. `src/components/FloorPlanManager.tsx` rendering logic

## Troubleshooting

### Can't Log In After Creating New Admin User

**Problem**: When you create a new admin user through the User Management interface, they cannot log in immediately.

**Cause**: Supabase has email confirmation enabled by default. New users must confirm their email before they can log in.

**Solution 1: Disable Email Confirmation (Recommended for Development)**

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Authentication** in the left sidebar
4. Click **Providers**
5. Click on **Email** in the list
6. Scroll down to **Email confirmation** section
7. **Uncheck** "Enable email confirmations"
8. Click **Save**

After this, new users can log in immediately without email confirmation.

**Solution 2: Manually Confirm Users (Recommended for Production)**

1. Go to **Authentication** > **Users** in your Supabase Dashboard
2. Find the newly created user
3. Click on the user
4. Click the **Confirm email** button
5. The user can now log in

**Solution 3: Auto-Confirm Through SQL (Advanced)**

You can set up a database trigger to auto-confirm users, but this is not recommended for production.

### Error: "Email logins are disabled"

**Problem**: When trying to log in, you get an error "Email logins are disabled" or "email_provider_disabled".

**Cause**: Email authentication is not enabled in your Supabase project.

**Solution**:
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Authentication** → **Providers**
4. Click on **Email**
5. **Toggle ON** "Enable Email provider"
6. Click **Save**

### Can't Log In (General)
- **First, check**: Is email authentication enabled in Supabase? (see above)
- Verify user exists in Supabase Auth → Users
- Verify user exists in `admin_users` table with matching ID
- Check if email confirmation is required (see above)
- Verify password meets requirements (6+ characters)
- Check browser console for errors

### Reservations Not Showing
- Check RLS policies are enabled
- Verify you're logged in as an admin user
- Check browser console for errors

### Widget Not Loading in WordPress
- Verify the app URL is correct (no trailing slash)
- Check browser console for CORS errors
- Ensure the `/widget` route is accessible

### Tables Not Appearing in Widget
- Verify tables are marked as `is_active = true`
- Verify room is marked as `is_active = true`
- Check table capacity is sufficient for party size

## Security Notes

- Never commit your `.env` file to version control
- Keep your Supabase keys secure
- Regularly review admin users and remove inactive accounts
- RLS policies are enforced - don't modify them unless necessary
- The public widget uses a secure Edge Function to create reservations

## Next Steps

1. ✅ Create admin account
2. ✅ Load sample data
3. ✅ Log in and explore the dashboard
4. ✅ Create your actual rooms and tables
5. ✅ Test making a reservation through the widget
6. ⬜ Set up Stripe for payments
7. ⬜ Integrate with WordPress
8. ⬜ Go live!

## Need Help?

- Check the main `SETUP.md` for detailed feature documentation
- Review Supabase logs for error messages
- Check browser console for frontend errors
- Verify database schema matches the migration file
