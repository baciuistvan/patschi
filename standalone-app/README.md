# Après-Ski Management System - Standalone Application

Complete reservation and gift card management system ready to deploy to your website.

## Features

### Reservation System
- **Floor Plan Manager** - Visual table layout with drag, drop, resize, and rotate
- **Drawing Tools** - Freehand drawing, shapes, and decorations
- **Reservation Management** - Create, view, edit, and manage table bookings
- **Multiple Rooms** - Support for different dining areas
- **Booking Hours** - Configurable time slots and availability
- **Booking Confirmation** - Automatic confirmation with optional Stripe payment

### Gift Card System
- **Create & Sell** - Digital gift cards with customizable amounts
- **Templates** - Multiple design templates
- **PDF Generation** - Automatic gift card PDF creation
- **Email Delivery** - Send gift cards via email
- **Verification** - Validate and redeem gift cards
- **Stripe Integration** - Secure payment processing

### System Features
- **User Management** - Admin, staff, and user roles
- **Dark Mode** - Toggle between light and dark themes
- **Multi-language** - English and German support
- **System Switcher** - Toggle between Reservation and Gift Card systems
- **Widget Support** - Embeddable reservation and gift card widgets
- **WordPress Integration** - Ready-to-use WordPress shortcodes

## Installation

### 1. Upload Files

Upload all files to your web server:
- `index.html` - Main application (login page)
- `assets/` - JavaScript and CSS files

### 2. Configure Supabase

You need a Supabase account and project. The application will guide you through configuration on first launch.

Required environment variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### 3. Database Setup

Run the migration files in your Supabase project (in order):
1. `migrations/20251107105233_create_reservation_system_schema.sql`
2. `migrations/20251107121937_fix_admin_users_rls_policy.sql`
3. Continue with remaining migrations...

### 4. Create Admin User

After setting up the database, create your first admin user in Supabase:

```sql
-- Create admin user in auth.users, then:
INSERT INTO admin_users (user_id, email, role)
VALUES ('your-user-id', 'admin@example.com', 'admin');
```

## Configuration

### Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a project
2. Get your project URL and anon key from Settings > API
3. Update the configuration in the application settings

### Stripe Setup (Optional)

For payment processing:
1. Get your Stripe keys from [stripe.com](https://stripe.com)
2. Add them in Settings > Stripe Settings
3. Deploy the Supabase Edge Functions for payment processing

### Edge Functions

Deploy these Edge Functions to your Supabase project:
- `create-reservation` - Handle reservation creation with optional payment
- `purchase-gift-card` - Process gift card purchases
- `generate-gift-card-pdf` - Create gift card PDFs
- `send-gift-card-email` - Email gift cards to recipients
- `verify-gift-card` - Validate gift card codes

## Usage

### Admin Dashboard

1. Open `index.html` in your browser
2. Login with your admin credentials
3. Access features from the navigation menu:
   - **Dashboard** - View statistics and system overview
   - **Floor Plan** - Design your restaurant layout
   - **Reservations** - Manage bookings
   - **Gift Cards** - Create and manage gift cards
   - **Users** - Manage user accounts
   - **Settings** - Configure system settings

### Widgets

Embed booking or gift card widgets on your website:

```html
<!-- Reservation Widget -->
<iframe src="https://yoursite.com/reservation-widget.html" width="100%" height="600px"></iframe>

<!-- Gift Card Widget -->
<iframe src="https://yoursite.com/gift-card-widget.html" width="100%" height="600px"></iframe>
```

### WordPress Integration

Use the provided PHP files:
- `wordpress-integration.php` - Main plugin file
- `reservation-widget.php` - Reservation booking widget
- `gift-card-widget.php` - Gift card purchase widget

## File Structure

```
standalone-app/
├── index.html              # Main application
├── assets/
│   ├── index-[hash].js    # Application JavaScript
│   └── index-[hash].css   # Application styles
├── migrations/             # Database migration files
├── functions/             # Supabase Edge Functions
└── README.md              # This file
```

## Security

- All API calls use Row Level Security (RLS)
- Stripe keys should be stored securely
- Never expose your Supabase service role key
- Use HTTPS in production
- Enable email verification for production use

## Support

For issues or questions:
1. Check the database migrations are applied correctly
2. Verify Supabase configuration
3. Check browser console for errors
4. Ensure all Edge Functions are deployed

## System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Web server with HTTPS support
- Supabase account (free tier available)
- Stripe account (optional, for payments)

## License

Proprietary - All rights reserved
