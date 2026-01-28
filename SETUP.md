# Après Ski Bar - Table Reservation System

A complete table reservation management system with backend dashboard and WordPress integration.

## Features

### Backend Management Dashboard
- **Floor Plan Manager**: Drag-and-drop interface to design and arrange tables across multiple rooms
- **Reservation Management**: View, confirm, cancel, and manage all reservations
- **Room Settings**: Create and manage different areas (Main Hall, Terrace, VIP Lounge, etc.)
- **Multi-user Support**: Admin and staff roles with different permissions

### Public Reservation Widget
- **Date & Time Selection**: Guests choose their preferred reservation time
- **Real-time Availability**: Shows only available tables based on existing reservations
- **Customer Information**: Collects guest details and special requests
- **Payment Integration**: Ready for Stripe integration (deposit system)

### WordPress Integration
- **Widget**: Easily add reservation form to any WordPress sidebar
- **Shortcode**: Embed reservations anywhere with `[apreski_reservations url="YOUR_APP_URL"]`

## Setup Instructions

### 1. Database Setup

The database schema has been automatically created with the following tables:
- `rooms` - Different areas in your bar
- `tables` - Individual tables with positioning
- `reservations` - Customer bookings
- `admin_users` - Staff access control

### 2. Create Your First Admin User

You need to create an admin user to access the dashboard:

1. Sign up through Supabase Auth (you can use the Supabase dashboard)
2. Get the user ID from the `auth.users` table
3. Insert an admin user record:

```sql
INSERT INTO admin_users (id, email, full_name, role)
VALUES ('YOUR_USER_ID', 'admin@apreski.bar', 'Admin Name', 'admin');
```

### 3. Set Up Rooms and Tables

1. Log in to the admin dashboard at: `YOUR_APP_URL/`
2. Go to Settings and create your first room (e.g., "Main Hall")
3. Go to Floor Plan and add tables using the "Add Table" button
4. Drag tables to arrange them on the floor plan
5. Configure table capacity and shape

### 4. WordPress Integration

#### Option A: Using the Widget

1. Copy `wordpress-integration.php` to your WordPress plugins folder
2. Activate the plugin in WordPress admin
3. Go to Appearance → Widgets
4. Add "Après Ski Reservations" widget to your sidebar
5. Configure with your app URL (e.g., `https://your-app.com`)

#### Option B: Using the Shortcode

Add this shortcode anywhere in your WordPress pages or posts:

```
[apreski_reservations url="https://your-app.com"]
```

You can also customize the height:

```
[apreski_reservations url="https://your-app.com" height="800px"]
```

### 5. Stripe Payment Integration

To enable Stripe payments for reservations:

1. Create a Stripe account at https://dashboard.stripe.com/register
2. Get your Stripe secret key from the Developers section
3. The system is ready to integrate Stripe - contact support for payment setup

For detailed Stripe setup instructions, visit: https://bolt.new/setup/stripe

## User Guide

### Admin Dashboard

#### Floor Plan Manager
- **Add Tables**: Click "Add Table" to create new tables
- **Drag & Drop**: Simply drag tables to reposition them on the floor plan
- **Edit Tables**: Hover over a table and click the edit icon
- **Table Properties**: Configure table number, capacity, size, and shape
- **Multiple Rooms**: Switch between rooms using the tabs at the top

#### Reservation Manager
- **View Filters**: Toggle between Today, Upcoming, or All reservations
- **Reservation Details**: Click any reservation to see full details
- **Status Updates**: Confirm, complete, or cancel reservations
- **Contact Information**: Access customer email and phone numbers
- **Payment Tracking**: Monitor payment status and amounts

#### Room Settings
- **Create Rooms**: Add new areas like "Terrace", "VIP Lounge", etc.
- **Edit Rooms**: Update room names and descriptions
- **Activation**: Toggle rooms active/inactive for availability

### Making Reservations (Widget)

The public widget guides customers through 4 simple steps:

1. **Date & Time**: Select reservation date, time, party size, and room
2. **Table Selection**: View and choose from available tables
3. **Guest Information**: Enter name, email, phone, and special requests
4. **Payment**: Review summary and complete payment (€350 deposit)

## Technical Details

### Reservation Logic
- Default reservation duration: 2 hours
- Availability check prevents double-bookings
- Tables require matching or greater capacity for party size
- Only active tables in active rooms are bookable

### Security
- Row Level Security (RLS) enabled on all tables
- Admin authentication required for management functions
- Public reservations created via secure Edge Function
- Customer data protected with proper policies

### Customization

You can customize:
- Reservation duration (default: 120 minutes)
- Deposit amount (default: €350)
- Available time slots (default: 11:00 - 24:00)
- Table shapes and sizes
- Room configurations

## Support

For technical support or feature requests, please contact your development team.

## URLs

- **Admin Dashboard**: `YOUR_APP_URL/`
- **Reservation Widget**: `YOUR_APP_URL/widget`
- **Stripe Setup Guide**: https://bolt.new/setup/stripe
