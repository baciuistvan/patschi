# Standalone Crew Dashboard

A comprehensive crew dashboard with visual table plan, calendar, and reservations all in one view.

## Features

### 1. Visual Floor Plan
- **Real-time table status**: Tables are color-coded
  - **Green**: Free/Available
  - **Red**: Booked with guest name and time
- **Multiple rooms**: Switch between different restaurant areas
- **Auto-refresh**: Updates every 30 seconds
- **Guest information**: Booked tables display guest names and reservation times

### 2. Interactive Calendar
- **Month view**: Navigate through months
- **Date selection**: Click any date to view reservations
- **Visual indicators**:
  - Current date highlighted in blue
  - Selected date highlighted
  - Dates from other months shown dimmed

### 3. Reservations List
- **Daily overview**: Shows all reservations for selected date
- **Key information displayed**:
  - Guest name
  - Reservation time
  - Party size
  - Table numbers assigned
  - Special requests/notes
- **Scrollable list**: Easy to browse through all reservations

## Layout

The dashboard uses a responsive 3-column layout:
- **Left column**: Calendar + Reservations list
- **Right columns (2)**: Large floor plan view

## Access

### URLs:
- Main app with crew mode: `/?mode=crew`
- Direct crew page: `/crew`
- Crew HTML: `/crew.html`

### Authentication:
- Requires crew/admin login
- Uses existing Supabase authentication
- Sign out button in top-right corner

## Features for Crew

### What Crew Can Do:
- View real-time table status
- See all reservations for any date
- Check guest names on booked tables
- View special requests and notes
- Switch between different room layouts
- Change language (EN/DE)
- Toggle dark/light theme

### What Crew Cannot Do:
- Cannot edit table layouts
- Cannot move or resize tables
- Cannot add/edit reservations
- Cannot access admin settings
- Read-only view for operational use

## Technical Details

### Data Refresh:
- Automatically refreshes every 30 seconds
- Manual refresh by changing dates
- Real-time updates from Supabase

### Responsive Design:
- Optimized for iPad use
- Works on desktop and mobile
- Touch-friendly interface
- PWA-ready (can be added to home screen)

### Performance:
- Efficient database queries
- Minimal data transfer
- Smooth animations and transitions

## Color Legend

Always visible on the floor plan:
- **Green** = Free table
- **Red** = Booked table (shows guest name + time)

## Date Logic

The dashboard shows reservations based on:
- Selected date in calendar
- Defaults to today's date
- Can view any past or future date

## Mobile/iPad Optimization

- Touch-optimized controls
- No accidental zooming
- Smooth scrolling
- Full-screen capable
- Works offline (after first load)

## Integration

The standalone crew dashboard:
- Uses same database as admin panel
- Reads same reservation data
- Displays same floor plans
- Shows same room configurations

## Use Cases

Perfect for:
- Kitchen display (view reservations)
- Host station (seating management)
- Service staff (table assignments)
- Bar staff (reservation overview)
- Management (daily operations)
