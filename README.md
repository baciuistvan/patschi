# Après Ski Bar - Table Reservation System

A complete, production-ready table reservation management system designed for après-ski bars and restaurants. Features a powerful backend dashboard with drag-and-drop floor planning, real-time availability checking, and seamless WordPress integration.

![System Overview](https://images.pexels.com/photos/260922/pexels-photo-260922.jpeg?auto=compress&cs=tinysrgb&w=1200)

## 🎯 Features

### 🎨 Backend Management Dashboard

- **Interactive Floor Plan Designer**
  - Drag-and-drop table positioning
  - Multiple room/area management
  - Customizable table shapes (rectangle, circle, square)
  - Real-time visual layout editor

- **Comprehensive Reservation Management**
  - View all reservations with filtering (Today/Upcoming/All)
  - Quick status updates (Confirm/Complete/Cancel)
  - Customer contact information
  - Payment tracking and status
  - Special requests handling

- **Multi-Room Configuration**
  - Create unlimited rooms/areas
  - Separate floor plans for each space
  - Toggle room availability
  - Detailed room descriptions

- **User Access Control**
  - Admin and Staff roles
  - Secure authentication via Supabase
  - Role-based permissions
  - Row-level security

### 🌐 Public Reservation Widget

- **Smart Booking Flow**
  - 4-step reservation process
  - Real-time availability checking
  - Automatic conflict detection
  - Party size-based table filtering

- **Professional Design**
  - Clean, modern interface
  - Mobile-responsive layout
  - Progress indicator
  - Clear error messaging

- **Payment Ready**
  - Deposit tracking system
  - Stripe integration ready
  - Payment status monitoring
  - Refund capability

### 🔌 WordPress Integration

- **Widget & Shortcode**
  - Easy sidebar widget
  - Flexible shortcode placement
  - Responsive iframe embedding
  - Customizable dimensions

- **Seamless Integration**
  - Single PHP file installation
  - No database modifications
  - Works with any theme
  - Minimal configuration

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works)
- WordPress site (for widget integration)

### Installation

1. **Clone and Install**
   ```bash
   git clone <your-repo>
   cd project
   npm install
   ```

2. **Configure Environment**
   - Your `.env` file is already configured with Supabase credentials
   - Credentials are available in the `.env` file

3. **Database Setup**
   - Database schema has been automatically created
   - See `ADMIN-SETUP.md` for creating your first admin user
   - Optional: Load sample data from `seed-data.sql`

4. **Start Development**
   ```bash
   npm run dev
   ```

5. **Access the System**
   - Admin Dashboard: `http://localhost:5173/`
   - Reservation Widget: `http://localhost:5173/widget`

## 📚 Documentation

- **[SETUP.md](SETUP.md)** - Complete feature documentation and user guide
- **[ADMIN-SETUP.md](ADMIN-SETUP.md)** - Step-by-step admin account creation
- **[STRIPE-INTEGRATION.md](STRIPE-INTEGRATION.md)** - Payment system setup guide
- **[seed-data.sql](seed-data.sql)** - Sample data for testing
- **[wordpress-integration.php](wordpress-integration.php)** - WordPress plugin file

## 🗂️ Project Structure

```
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx           # Main admin dashboard
│   │   ├── FloorPlanManager.tsx    # Drag-and-drop floor plan editor
│   │   ├── ReservationManager.tsx  # Reservation list and management
│   │   ├── RoomSettings.tsx        # Room configuration
│   │   ├── ReservationWidget.tsx   # Public booking widget
│   │   └── LoginPage.tsx           # Admin authentication
│   ├── contexts/
│   │   └── AuthContext.tsx         # Authentication state management
│   ├── lib/
│   │   └── supabase.ts             # Supabase client and types
│   ├── App.tsx                     # Main app router
│   └── main.tsx                    # App entry point
├── supabase/
│   └── functions/
│       └── create-reservation/     # Edge function for reservations
├── wordpress-integration.php       # WordPress plugin
├── seed-data.sql                   # Sample database data
└── Documentation files (.md)
```

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Authentication**: Supabase Auth
- **Build Tool**: Vite
- **Payment**: Stripe (integration ready)

## 🎯 Usage Guide

### Creating Your First Admin User

1. Sign up via Supabase Dashboard → Authentication → Users
2. Copy the user ID from the created user
3. Run this SQL in Supabase SQL Editor:

```sql
INSERT INTO admin_users (id, email, full_name, role)
VALUES ('YOUR_USER_ID', 'admin@example.com', 'Admin Name', 'admin');
```

See [ADMIN-SETUP.md](ADMIN-SETUP.md) for detailed instructions.

### Setting Up Rooms and Tables

1. Log in to the admin dashboard
2. Navigate to **Settings** → Add rooms (e.g., Main Hall, Terrace)
3. Go to **Floor Plan** → Click "Add Table"
4. Configure table properties (number, capacity, shape)
5. Drag tables to arrange them on the floor plan
6. Click and drag to reposition tables anytime

### Managing Reservations

1. Navigate to **Reservations** tab
2. Use filters to view Today/Upcoming/All reservations
3. Click any reservation to see full details
4. Update status with one click:
   - **Confirm** - Approve the reservation
   - **Complete** - Mark as finished
   - **Cancel** - Cancel the booking

### Installing WordPress Widget

1. Copy `wordpress-integration.php` to:
   ```
   /wp-content/plugins/apreski-reservation-widget/
   ```

2. Activate in WordPress Admin → Plugins

3. **Option A - Widget:**
   - Go to Appearance → Widgets
   - Add "Après Ski Reservations" to sidebar
   - Enter your app URL

4. **Option B - Shortcode:**
   ```
   [apreski_reservations url="https://your-app.com"]
   ```

## 🔐 Security Features

- ✅ Row-Level Security (RLS) on all database tables
- ✅ Authenticated admin access only
- ✅ Secure Edge Functions for public reservations
- ✅ Email validation and sanitization
- ✅ CORS protection
- ✅ SQL injection prevention
- ✅ XSS protection

## 🎨 Customization

### Changing Reservation Duration

Edit `src/components/ReservationWidget.tsx`:
```typescript
duration_minutes: 120, // Change from 120 to your desired minutes
```

### Modifying Deposit Amount

Edit `src/components/ReservationWidget.tsx`:
```typescript
payment_amount: 20, // Change from 20 to your desired amount
```

### Adjusting Available Time Slots

Edit `src/components/ReservationWidget.tsx`:
```typescript
// Currently 11:00 AM - 12:00 AM (midnight)
Array.from({ length: 14 }, (_, i) => i + 11)
// Adjust 14 (duration) and 11 (start hour)
```

### Color Scheme

The system uses a dark slate theme with blue accents. To customize:
- Edit Tailwind classes in components
- Main colors: `slate-900` (dark), `blue-600` (accent)

## 💳 Stripe Integration

The system is **ready for Stripe integration**. Payment tracking is already built-in:

- ✅ Payment status fields (unpaid/paid/refunded)
- ✅ Deposit amount tracking
- ✅ Payment Intent ID storage
- ✅ Admin payment dashboard
- ⏸️ Stripe API integration pending

To enable payments:
1. Create Stripe account at https://dashboard.stripe.com/register
2. Get your API keys
3. Follow the detailed guide in [STRIPE-INTEGRATION.md](STRIPE-INTEGRATION.md)

For setup assistance: https://bolt.new/setup/stripe

## 📊 Database Schema

The system uses 4 main tables:

- **rooms** - Dining areas (Main Hall, Terrace, etc.)
- **tables** - Individual tables with positions and capacity
- **reservations** - Customer bookings with payment info
- **admin_users** - Staff access control

All tables have Row-Level Security enabled with proper policies.

## 🧪 Testing

### Load Sample Data

Run `seed-data.sql` in Supabase SQL Editor to create:
- 3 sample rooms
- 10 tables across rooms
- 5 test reservations

### Test Scenarios

1. **Admin Login**: Use your created admin account
2. **Create Table**: Add a table via Floor Plan Manager
3. **Make Reservation**: Use the `/widget` route
4. **Manage Booking**: Confirm/cancel from admin dashboard
5. **WordPress Widget**: Test iframe embedding

## 🚀 Deployment

### Frontend Deployment

Deploy to any static hosting (Vercel, Netlify, etc.):

```bash
npm run build
# Upload dist/ folder to your hosting
```

### Environment Variables

Ensure these are set in production:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Domain Configuration

Update URLs in:
- WordPress widget configuration
- CORS settings (if needed)
- Redirect URLs in Supabase Auth

## 🐛 Troubleshooting

### Can't Log In
- Verify user exists in `auth.users`
- Verify user exists in `admin_users` with same ID
- Check browser console for errors

### Tables Not Showing in Widget
- Ensure tables are `is_active = true`
- Ensure room is `is_active = true`
- Verify table capacity ≥ party size

### WordPress Widget Not Loading
- Check app URL (no trailing slash)
- Verify `/widget` route is accessible
- Check browser console for CORS errors

See [ADMIN-SETUP.md](ADMIN-SETUP.md) for more troubleshooting tips.

## 📈 Roadmap

Potential future enhancements:
- [ ] Email confirmations via SendGrid/Resend
- [ ] SMS notifications via Twilio
- [ ] Multi-language support
- [ ] Calendar view for reservations
- [ ] Revenue analytics dashboard
- [ ] Customer loyalty program
- [ ] Table combination for large parties
- [ ] Waitlist management

## 🤝 Contributing

This is a custom business application. For modifications or enhancements, contact your development team.

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

- Technical Documentation: See `.md` files in project root
- Supabase Issues: Check Supabase Dashboard logs
- WordPress Issues: Check WordPress debug.log
- General Questions: Contact your development team

---

**Built with ❤️ for après-ski bars everywhere** 🎿⛷️

Enjoy the slopes and the bookings! 🏔️
