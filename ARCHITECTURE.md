# System Architecture

## Overview

The Après Ski Bar Reservation System is built with a modern, scalable architecture using React frontend, Supabase backend, and WordPress integration capabilities.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │  Admin Dashboard │         │ Reservation Widget│             │
│  │  (React SPA)     │         │   (React Widget)  │             │
│  │                  │         │                   │             │
│  │  - Login Page    │         │  - Date Selection │             │
│  │  - Floor Plan    │         │  - Table Choice   │             │
│  │  - Reservations  │         │  - Guest Info     │             │
│  │  - Room Settings │         │  - Payment        │             │
│  └────────┬─────────┘         └────────┬──────────┘             │
│           │                            │                         │
│           └────────────┬───────────────┘                         │
│                        │                                         │
└────────────────────────┼─────────────────────────────────────────┘
                         │
                    [HTTPS/WSS]
                         │
┌────────────────────────┼─────────────────────────────────────────┐
│                   SUPABASE LAYER                                  │
├────────────────────────┼─────────────────────────────────────────┤
│                        │                                         │
│  ┌─────────────────────▼────────────────┐                        │
│  │      Supabase Auth Service           │                        │
│  │  - JWT Token Management              │                        │
│  │  - Session Handling                  │                        │
│  │  - User Authentication               │                        │
│  └─────────────────────┬────────────────┘                        │
│                        │                                         │
│  ┌─────────────────────▼────────────────┐                        │
│  │      PostgreSQL Database             │                        │
│  │  with Row Level Security (RLS)       │                        │
│  │                                      │                        │
│  │  Tables:                             │                        │
│  │  ├─ admin_users (auth control)       │                        │
│  │  ├─ rooms (dining areas)             │                        │
│  │  ├─ tables (with positioning)        │                        │
│  │  └─ reservations (bookings)          │                        │
│  │                                      │                        │
│  │  Policies:                           │                        │
│  │  ├─ Admin-only operations            │                        │
│  │  └─ Public reservation creation      │                        │
│  └──────────────────────────────────────┘                        │
│                                                                   │
│  ┌──────────────────────────────────────┐                        │
│  │      Edge Functions (Deno)           │                        │
│  │                                      │                        │
│  │  - create-reservation                │                        │
│  │    * Validates input                 │                        │
│  │    * Inserts reservation             │                        │
│  │    * Returns confirmation            │                        │
│  │                                      │                        │
│  │  [Future: Stripe integration]        │                        │
│  │  - create-payment-intent             │                        │
│  │  - stripe-webhook                    │                        │
│  └──────────────────────────────────────┘                        │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                     INTEGRATION LAYER                             │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────┐                        │
│  │      WordPress Integration           │                        │
│  │                                      │                        │
│  │  Plugin: wordpress-integration.php   │                        │
│  │                                      │                        │
│  │  ┌─────────────┐  ┌──────────────┐  │                        │
│  │  │   Widget    │  │  Shortcode   │  │                        │
│  │  │             │  │              │  │                        │
│  │  │  Sidebar/   │  │  Page/Post   │  │                        │
│  │  │  Footer     │  │  Embedding   │  │                        │
│  │  └──────┬──────┘  └──────┬───────┘  │                        │
│  │         │                │           │                        │
│  │         └────────┬───────┘           │                        │
│  │                  │                   │                        │
│  │         ┌────────▼────────┐          │                        │
│  │         │  iFrame Embed   │          │                        │
│  │         │  → /widget      │          │                        │
│  │         └─────────────────┘          │                        │
│  └──────────────────────────────────────┘                        │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                      PAYMENT LAYER (Future)                       │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────┐                        │
│  │           Stripe API                 │                        │
│  │                                      │                        │
│  │  - Payment Intent Creation           │                        │
│  │  - Card Processing                   │                        │
│  │  - Webhook Events                    │                        │
│  │  - Refund Processing                 │                        │
│  └──────────────────────────────────────┘                        │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Admin User Authentication Flow

```
1. User visits / → Login Page
2. Enter email + password
3. Supabase Auth validates credentials
4. JWT token issued
5. AuthContext checks admin_users table
6. Dashboard renders with user data
```

### Reservation Creation Flow

```
1. Customer visits /widget
2. Selects date, time, party size, room
3. Widget queries tables via Supabase Client
4. Filters by capacity and active status
5. Cross-references existing reservations
6. Displays available tables
7. Customer selects table + enters info
8. Calls create-reservation Edge Function
9. Edge Function inserts into database
10. Confirmation displayed to customer
11. Admin sees new reservation in dashboard
```

### Floor Plan Update Flow

```
1. Admin drags table on floor plan
2. onDrop captures new coordinates
3. Supabase UPDATE query via client
4. RLS verifies admin permission
5. Database updated
6. UI reflects new position
7. Future reservations use new layout
```

## Component Hierarchy

```
App.tsx
├─ AuthProvider (Context)
│  └─ AppContent
│     ├─ LoginPage (unauthenticated)
│     ├─ Dashboard (authenticated admin)
│     │  ├─ Navigation Bar
│     │  └─ View Switcher
│     │     ├─ FloorPlanManager
│     │     │  ├─ Room Selector
│     │     │  ├─ Canvas (drag-drop)
│     │     │  └─ TableFormModal
│     │     ├─ ReservationManager
│     │     │  ├─ Filter Buttons
│     │     │  ├─ Reservation Cards
│     │     │  └─ Status Update Modal
│     │     └─ RoomSettings
│     │        ├─ Room Cards
│     │        └─ RoomFormModal
│     └─ ReservationWidget (public)
│        ├─ Step 1: Date/Time
│        ├─ Step 2: Table Selection
│        ├─ Step 3: Guest Info
│        ├─ Step 4: Payment
│        └─ Success Message
```

## Database Schema

```sql
┌──────────────┐         ┌──────────────┐
│ admin_users  │         │    rooms     │
├──────────────┤         ├──────────────┤
│ id (PK, FK)  │         │ id (PK)      │
│ email        │         │ name         │
│ full_name    │         │ description  │
│ role         │         │ is_active    │
└──────────────┘         └───────┬──────┘
                                 │
                                 │ 1:N
                                 │
                         ┌───────▼──────┐
                         │    tables    │
                         ├──────────────┤
                         │ id (PK)      │
                         │ room_id (FK) │
                         │ table_number │
                         │ capacity     │
                         │ position_x   │
                         │ position_y   │
                         │ width/height │
                         │ shape        │
                         │ is_active    │
                         └───────┬──────┘
                                 │
                                 │ 1:N
                                 │
                      ┌──────────▼────────────┐
                      │    reservations       │
                      ├───────────────────────┤
                      │ id (PK)               │
                      │ table_id (FK)         │
                      │ customer_name         │
                      │ customer_email        │
                      │ customer_phone        │
                      │ party_size            │
                      │ reservation_date      │
                      │ reservation_time      │
                      │ duration_minutes      │
                      │ status                │
                      │ special_requests      │
                      │ payment_status        │
                      │ payment_amount        │
                      │ stripe_payment_intent │
                      └───────────────────────┘
```

## Security Model

### Row Level Security Policies

```
admin_users:
├─ SELECT: authenticated users
├─ INSERT: admins only
└─ UPDATE/DELETE: (not permitted)

rooms:
├─ SELECT: authenticated users
├─ INSERT: admins only
├─ UPDATE: admins only
└─ DELETE: admins only

tables:
├─ SELECT: authenticated users
├─ INSERT: admins only
├─ UPDATE: authenticated users (staff can update positions)
└─ DELETE: admins only

reservations:
├─ SELECT: authenticated users
├─ INSERT: via Edge Function (bypasses RLS with service key)
├─ UPDATE: authenticated users
└─ DELETE: authenticated users
```

### Authentication Flow

```
Public Access:
└─ /widget → No auth required
   └─ create-reservation Edge Function uses service role key

Admin Access:
└─ / → Requires authentication
   ├─ Supabase Auth validates JWT
   ├─ admin_users table lookup
   └─ RLS policies enforced on all queries
```

## Technology Stack Details

### Frontend
- **React 18.3** - UI library
- **TypeScript 5.5** - Type safety
- **Vite 5.4** - Build tool & dev server
- **Tailwind CSS 3.4** - Styling
- **Lucide React** - Icons

### Backend
- **Supabase** - Backend-as-a-Service
  - PostgreSQL 15 - Database
  - PostgREST - Auto-generated REST API
  - GoTrue - Authentication
  - Deno Edge Functions - Serverless compute
  - Realtime - WebSocket subscriptions

### Integration
- **WordPress PHP Widget** - CMS integration
- **Stripe API** (ready) - Payment processing

## Performance Considerations

### Database Indexes
```sql
- reservations(reservation_date, reservation_time) - Fast availability queries
- reservations(table_id) - Quick table lookups
- reservations(customer_email) - Customer history
- tables(room_id) - Room filtering
```

### Client-Side Optimizations
- React Context for auth state (avoids prop drilling)
- Conditional rendering (only load active view)
- Optimistic UI updates for drag-and-drop
- Debounced search/filter operations

### Edge Function Benefits
- Runs close to users (Deno Deploy global network)
- No cold starts for frequently used functions
- Service role access bypasses RLS for public operations
- Automatic scaling

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Static File Hosting             │
│  (Vercel/Netlify/Cloudflare Pages)     │
│                                         │
│  - Serves built React app               │
│  - Automatic HTTPS                      │
│  - Global CDN                           │
│  - Environment variables                │
└────────────┬────────────────────────────┘
             │
             │ API Calls
             │
┌────────────▼────────────────────────────┐
│        Supabase Cloud                   │
│                                         │
│  - Database (managed PostgreSQL)        │
│  - Auth (managed authentication)        │
│  - Edge Functions (Deno Deploy)         │
│  - Automatic backups                    │
│  - Connection pooling                   │
└─────────────────────────────────────────┘
```

## Scalability

### Current Capacity
- **Concurrent Users**: 1000s (Supabase handles this)
- **Database**: Postgres scales vertically
- **Edge Functions**: Auto-scale horizontally
- **Static Assets**: CDN cached globally

### Growth Path
1. **More Locations**: Add rooms/tables (no code changes)
2. **More Reservations**: Database indexes handle growth
3. **More Traffic**: Edge Functions auto-scale
4. **Global Expansion**: Multi-region Supabase (enterprise)

## Monitoring & Observability

### Built-in Tools
- **Supabase Dashboard**: Query performance, errors
- **Browser Console**: Frontend errors
- **Network Tab**: API call inspection
- **Database Logs**: SQL query performance

### Recommended Additions
- Error tracking (Sentry)
- Analytics (Plausible/Google Analytics)
- Uptime monitoring (UptimeRobot)
- Performance monitoring (Web Vitals)

## Backup & Recovery

### Automatic
- Supabase: Daily automated backups (Pro plan+)
- Point-in-time recovery available

### Manual
```sql
-- Export all data
pg_dump -h db.xxx.supabase.co -U postgres > backup.sql

-- Restore
psql -h db.xxx.supabase.co -U postgres < backup.sql
```

## Development Workflow

```
1. Local Development
   ├─ npm run dev
   ├─ Edit components
   ├─ Test in browser
   └─ Supabase points to hosted instance

2. Testing
   ├─ Create test reservations
   ├─ Test admin functions
   └─ Verify RLS policies

3. Build
   ├─ npm run build
   └─ Test production build locally

4. Deploy
   ├─ Push to Git
   ├─ Auto-deploy (Vercel/Netlify)
   └─ Verify production site
```

## Future Enhancements

### Planned Architecture Changes
- **Email Service**: Add Resend/SendGrid Edge Function
- **SMS Service**: Add Twilio Edge Function
- **Analytics**: Custom dashboard with Supabase + Chart.js
- **Caching**: Redis for hot availability data
- **Search**: Full-text search for reservations

### Integration Possibilities
- **POS Systems**: API endpoints for order integration
- **Calendar Services**: Google Calendar sync
- **CRM Systems**: Export customer data
- **Marketing Tools**: Mailchimp integration

---

This architecture provides a solid foundation for a production-ready reservation system with room to grow! 🚀
