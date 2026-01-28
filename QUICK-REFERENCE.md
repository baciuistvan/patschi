# Quick Reference Guide

## 🚀 Getting Started in 5 Minutes

### 1. Create Admin Account (2 min)
```sql
-- In Supabase SQL Editor
INSERT INTO admin_users (id, email, full_name, role)
VALUES ('YOUR_SUPABASE_USER_ID', 'admin@example.com', 'Your Name', 'admin');
```

### 2. Load Sample Data (1 min)
```sql
-- Copy/paste seed-data.sql into Supabase SQL Editor and execute
```

### 3. Log In (1 min)
- Go to `http://localhost:5173/`
- Enter your email and password
- Start managing reservations!

### 4. Test Widget (1 min)
- Go to `http://localhost:5173/widget`
- Make a test reservation
- See it appear in admin dashboard

---

## 📍 Important URLs

| Purpose | URL | Auth Required |
|---------|-----|---------------|
| Admin Dashboard | `/` | ✅ Yes |
| Reservation Widget | `/widget` | ❌ No |
| Supabase Dashboard | From `.env` file | ✅ Yes |

---

## 🔑 Default Settings

| Setting | Value | Location |
|---------|-------|----------|
| Reservation Duration | 2 hours (120 min) | `ReservationWidget.tsx` |
| Deposit Amount | €350 | `ReservationWidget.tsx` |
| Available Hours | 11:00 - 24:00 | `ReservationWidget.tsx` |
| Min Party Size | 1 | Widget form |
| Max Party Size | 20 | Widget form |

---

## 🎨 Admin Dashboard Navigation

```
┌─────────────────────────────────────┐
│  Après Ski Bar [Admin Dashboard]   │
├─────────────────────────────────────┤
│  [Floor Plan] [Reservations] [Settings]
│
├─ Floor Plan Manager
│  ├─ Room tabs (Main Hall, Terrace, etc.)
│  ├─ Add Table button
│  └─ Drag tables to position
│
├─ Reservations
│  ├─ Filter: Today / Upcoming / All
│  ├─ Click reservation → Update status
│  └─ View customer details & payment
│
└─ Settings
   ├─ Add/Edit Rooms
   ├─ Room descriptions
   └─ Toggle active status
```

---

## 📋 Common Tasks

### Add a New Room
1. Settings tab → "Add Room"
2. Enter name (e.g., "VIP Lounge")
3. Add description (optional)
4. Check "Active" → Save

### Add a Table
1. Floor Plan tab → Select room
2. Click "Add Table"
3. Set: Number, Capacity, Size, Shape
4. Save → Drag to position

### Confirm a Reservation
1. Reservations tab
2. Click the reservation
3. Click "Confirm Reservation"

### Make a Test Reservation
1. Visit `/widget`
2. Select: Date, Time, Party Size
3. Choose table
4. Enter: Name, Email
5. Click "Pay & Confirm"

---

## 🔧 Quick Fixes

### Problem: Can't log in
**Solution:**
```sql
-- Check if admin user exists
SELECT * FROM admin_users WHERE email = 'your@email.com';

-- If missing, add it:
INSERT INTO admin_users (id, email, full_name, role)
VALUES ('YOUR_USER_ID', 'your@email.com', 'Name', 'admin');
```

### Problem: No tables showing in widget
**Solution:**
```sql
-- Make sure tables are active
UPDATE tables SET is_active = true;
UPDATE rooms SET is_active = true;
```

### Problem: Widget not loading in WordPress
**Check:**
- App URL has no trailing slash
- URL format: `https://your-app.com` ✅
- Not: `https://your-app.com/` ❌

---

## 🗄️ Useful SQL Queries

### View all reservations for today
```sql
SELECT * FROM reservations
WHERE reservation_date = CURRENT_DATE
ORDER BY reservation_time;
```

### Find available tables
```sql
SELECT * FROM tables
WHERE is_active = true
AND capacity >= 4;  -- Adjust party size
```

### List all admin users
```sql
SELECT email, full_name, role FROM admin_users;
```

### Check room status
```sql
SELECT name, is_active,
  (SELECT COUNT(*) FROM tables WHERE room_id = rooms.id) as table_count
FROM rooms;
```

### Recent reservations by status
```sql
SELECT status, COUNT(*) as count
FROM reservations
WHERE reservation_date >= CURRENT_DATE
GROUP BY status;
```

---

## 📦 File Locations

### Documentation
- `README.md` - Project overview
- `SETUP.md` - Complete feature guide
- `ADMIN-SETUP.md` - Admin account setup
- `STRIPE-INTEGRATION.md` - Payment setup

### Code
- `src/components/` - All React components
- `src/lib/supabase.ts` - Database types & client
- `src/contexts/AuthContext.tsx` - Authentication

### Integration
- `wordpress-integration.php` - WordPress plugin
- `supabase/functions/` - Edge functions

### Data
- `seed-data.sql` - Sample database data

---

## 🎯 WordPress Quick Start

### Install Plugin
```bash
cp wordpress-integration.php /wp-content/plugins/apreski-reservation-widget/
```

### Activate & Configure
1. WordPress Admin → Plugins → Activate
2. Appearance → Widgets
3. Add "Après Ski Reservations"
4. Set URL to your app URL

### Use Shortcode
```
[apreski_reservations url="https://your-app.com"]
```

---

## 🔐 Security Checklist

- ✅ RLS enabled on all tables
- ✅ Admin authentication required
- ✅ Public reservations via Edge Function
- ✅ Environment variables secured
- ✅ No exposed secrets in code
- ✅ CORS properly configured
- ✅ SQL injection protected
- ✅ Input validation active

---

## 🎨 Customization Quick Edits

### Change Primary Color
Find and replace in components:
- `blue-600` → `emerald-600` (or any color)
- `blue-700` → `emerald-700`

### Change Deposit Amount
`ReservationWidget.tsx` line ~10:
```typescript
payment_amount: 20, // Change to any amount
```

### Change Available Hours
`ReservationWidget.tsx` line ~120:
```typescript
// Currently 11 AM to 12 AM (13 hours)
Array.from({ length: 13 }, (_, i) => i + 11)
```

---

## 📞 Support Resources

| Need Help With | Check This |
|----------------|------------|
| Initial Setup | `ADMIN-SETUP.md` |
| Features | `SETUP.md` |
| Payments | `STRIPE-INTEGRATION.md` |
| WordPress | `wordpress-integration.php` comments |
| Database | Supabase Dashboard → Database |
| Errors | Browser Console + Supabase Logs |

---

## ✅ Pre-Launch Checklist

- [ ] Admin account created
- [ ] Rooms configured
- [ ] Tables added and positioned
- [ ] Test reservation completed
- [ ] WordPress widget tested (if using)
- [ ] Staff accounts created (if needed)
- [ ] Stripe configured (optional)
- [ ] Production URLs updated
- [ ] Backup strategy in place
- [ ] Contact information updated

---

**Need more details?** Check the full documentation files!

**Ready to go live?** Run `npm run build` and deploy! 🚀
