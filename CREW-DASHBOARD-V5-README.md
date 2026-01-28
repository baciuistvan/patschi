# Crew Dashboard v5 - German-Only Read-Only Floor Plan

## Overview

The Crew Dashboard v5 is a German-only, iPad-optimized dashboard designed for staff to view table reservations in real-time. It features a read-only floor plan with automatic updates and integrated gift card verification.

## What Was Created

### 1. German-Only Translation Module
**Location:** `src/lib/crewTranslations.ts`

A dedicated German translation module containing all text used in the Crew Dashboard. This eliminates the need for a language switcher and provides a simplified, German-only interface.

### 2. Read-Only Floor Plan View Component
**Location:** `src/components/CrewFloorPlanView.tsx`

A specialized read-only floor plan component with the following features:
- **Color-coded status**: Green tables are available, red tables are booked
- **Customer information**: Booked tables display customer names, times, and party sizes
- **Auto-refresh**: Automatically updates every 30 seconds
- **Date selection**: View reservations for any date
- **Room selection**: Switch between different rooms/areas
- **No editing**: Pure viewing interface with no modification capabilities

### 3. Main Crew Dashboard Component
**Location:** `src/components/CrewDashboardMain.tsx`

The main dashboard interface featuring:
- **Gift card verification**: Quick verification input in the header
- **Gift card details**: Expandable panel showing full gift card information
- **Theme toggle**: Switch between light and dark modes
- **Last updated indicator**: Shows when data was last refreshed
- **Compact header**: Optimized for iPad screens
- **No language switcher**: German-only interface

### 4. Crew Entry Point
**Location:** `src/crew.tsx`

A separate entry point for building the crew dashboard independently from the main application.

### 5. iPad-Optimized HTML Template
**Location:** `crew.html` (root) and `dist/crew.html`

A dedicated HTML file optimized for iPad with:
- **PWA capabilities**: Can be added to home screen
- **Touch optimizations**: Disabled text selection, optimized tap targets
- **Smooth scrolling**: Native touch scrolling behavior
- **Loading screen**: Professional loading experience
- **Fixed positioning**: Prevents bounce effects on iPad

## Key Features

### ✅ Read-Only Floor Plan
- View-only interface with no editing capabilities
- Color-coded table status (green = available, red = booked)
- Shows customer names, reservation times, and party sizes on booked tables
- Visual representation matches your configured floor plan

### ✅ Auto-Refresh
- Automatically updates data every 30 seconds
- Manual refresh button available
- Last updated timestamp displayed
- Refresh indicator shows when data is being loaded

### ✅ Gift Card Verification
- Quick input field in the header
- Instant verification against database
- Detailed gift card information display:
  - Current balance and original amount
  - Recipient and purchaser information
  - Purchase and expiry dates
  - Personal message
  - Status indicator (active, used, expired, cancelled)
- Expandable details panel for full information

### ✅ German-Only Interface
- No language toggle needed
- All text in German
- Localized date and currency formatting
- Simplified interface reduces confusion

### ✅ Dark/Light Theme
- Default dark mode (perfect for low-light restaurant environments)
- Toggle button in header
- Persistent theme selection (saved in localStorage)
- Smooth transitions between themes

### ✅ iPad Optimized
- **PWA Support**: Add to home screen for app-like experience
- **Touch-optimized**: Proper touch targets and gestures
- **No bounce**: Disabled overscroll bounce effect
- **Smooth scrolling**: Native iOS scrolling behavior
- **Fixed viewport**: Prevents zooming and unwanted scaling
- **Loading screen**: Professional initial loading experience

## File Structure

```
project/
├── src/
│   ├── lib/
│   │   └── crewTranslations.ts          # German translations
│   ├── components/
│   │   ├── CrewFloorPlanView.tsx        # Read-only floor plan
│   │   └── CrewDashboardMain.tsx        # Main dashboard with gift card verification
│   └── crew.tsx                         # Crew entry point
├── crew.html                            # iPad-optimized HTML template (source)
├── dist/
│   └── crew.html                        # Built HTML file
└── public/
    └── crew.html                        # Deployed HTML file
```

## How to Use

### Development Mode
```bash
# Run the development server
npm run dev

# Access the crew dashboard at:
# http://localhost:5173/crew.html
```

### Production Build
```bash
# Build the project
npm run build

# The crew dashboard will be built to:
# - dist/crew.html
# - public/crew.html
```

### Accessing the Dashboard

1. **Web Browser**: Navigate to `/crew.html` on your domain
2. **iPad**:
   - Open Safari and navigate to `/crew.html`
   - Tap the Share button
   - Select "Add to Home Screen"
   - The dashboard will now appear as an app icon

## Configuration

### Supabase Connection
The dashboard connects to your existing Supabase database using the configuration in `.env`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Auto-Refresh Interval
To change the auto-refresh interval, edit `CrewFloorPlanView.tsx`:
```typescript
// Change 30000 (30 seconds) to your desired interval in milliseconds
const interval = setInterval(() => {
  loadData();
}, 30000);
```

### Theme Default
To change the default theme, edit `CrewDashboardMain.tsx`:
```typescript
// Change 'dark' to 'light' for default light mode
const [theme, setTheme] = useState<'light' | 'dark'>(() => {
  const saved = localStorage.getItem('crew-theme');
  return (saved as 'light' | 'dark') || 'dark';
});
```

## Database Requirements

The dashboard requires the following tables in your Supabase database:
- `rooms` - Restaurant areas/sections
- `tables` - Individual tables with positioning data
- `reservations` - Customer reservations
- `gift_cards` - Gift card information

All required tables should already exist from your main application setup.

## Security Notes

- The dashboard uses public read access for viewing data
- No authentication required (designed for staff use in restaurant)
- Gift card verification uses public read policy
- No data modification capabilities in this interface
- For added security, consider implementing basic authentication

## Browser Compatibility

Optimized for:
- Safari on iPad (primary target)
- Safari on iPhone
- Chrome on Android tablets
- Desktop browsers (Chrome, Firefox, Safari, Edge)

## Troubleshooting

### Tables Not Showing
- Verify that rooms and tables exist in your database
- Check that `is_active` is set to `true` for rooms and tables
- Open browser console to check for errors

### Gift Card Verification Not Working
- Verify Supabase connection in `.env` file
- Check that gift_cards table exists
- Verify public read policy is enabled on gift_cards table

### Auto-Refresh Not Working
- Check browser console for errors
- Verify network connectivity
- Try manual refresh button

### iPad Home Screen Icon Not Working
- Ensure icon files exist: `crew-icon-180.png` and `crew-icon-512.png`
- Clear Safari cache and try again
- Verify PWA meta tags in `crew.html`

## Future Enhancements (Not Implemented)

- Push notifications for new reservations
- Offline mode with service worker
- Reservation filtering and search
- Export reservation list
- Table status history
- Integration with POS system

## Differences from Original CrewDashboard Component

The original `src/components/CrewDashboard.tsx` is a **full-featured management interface** with:
- Language switcher (English/German)
- Full editing capabilities
- Authentication required
- Floor plan editor
- Reservation management with CRUD operations

The new Crew Dashboard v5 is a **simplified viewing interface** with:
- German-only
- Read-only floor plan
- No authentication
- Gift card verification
- Auto-refresh
- iPad-optimized

Both dashboards can coexist in your application, serving different purposes and user groups.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Verify database configuration and connectivity
4. Check that all required components are properly built
