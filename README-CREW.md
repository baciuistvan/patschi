# Crew Dashboard - Standalone Version

## Problem Fixed

**Issue:** After crew login, users were being redirected back to the backend/admin dashboard.

**Solution:** Created a standalone single-page application that:
- Manages its own authentication state
- Never redirects or navigates away
- Stays on the same page throughout the entire session
- Stores crew sessions independently in localStorage

## Files

- `crew-dashboard.html` - Complete standalone crew dashboard

## How to Use

### Option 1: Direct File Access
1. Open `crew-dashboard.html` directly in your browser
2. Login with:
   - Username: `Crew`
   - Password: `crew123`

### Option 2: Deploy to Web Server
1. Upload `crew-dashboard.html` to your web server
2. Access it via: `https://yourdomain.com/crew-dashboard.html`

### Option 3: Rename as Index
1. Rename to `index.html` in a dedicated directory
2. Access via: `https://yourdomain.com/crew/`

## Features

### Authentication
- Crew-specific login (no admin access)
- Session persistence across page reloads
- Secure logout functionality
- No redirects - stays on same page

### Dashboard
- Welcome screen with user name
- Quick access cards for:
  - Reservations management
  - Gift card validation
  - Floor plan/table management

## Configuration

The file includes embedded Supabase configuration:
```javascript
const SUPABASE_URL = 'https://qwwerwkekvmaswusvgxy.supabase.co';
const SUPABASE_ANON_KEY = '[your-key]';
```

No additional setup required - it works out of the box.

## Technical Details

- **Framework:** Vanilla JavaScript (no build step required)
- **Styling:** Tailwind CSS via CDN
- **Storage:** localStorage for session persistence
- **Backend:** Supabase Edge Functions
- **File Size:** ~10 KB (single file)

## Edge Function Requirements

The dashboard requires the `crew-login` edge function to be deployed:
```sql
POST /functions/v1/crew-login
Body: { "username": "Crew", "password": "crew123" }
Response: { "success": true, "user": {...}, "token": "..." }
```

## Default Credentials

- **Username:** Crew (case insensitive)
- **Password:** crew123

Change these in the Supabase `crew_members` table or edge function logic.

## Troubleshooting

### Login doesn't work
- Check browser console for errors
- Verify Supabase edge function is deployed
- Confirm network connectivity

### Session doesn't persist
- Check if localStorage is enabled in browser
- Verify cookies/storage isn't being cleared
- Check browser privacy settings

### Redirects to backend
- Make sure you're using `crew-dashboard.html`, not the admin index.html
- Clear browser cache
- Check if you have the correct file

## Advantages of This Approach

1. **No Build Required** - Single HTML file, works immediately
2. **No Redirects** - Stays on same page, better UX
3. **Independent** - Doesn't interfere with admin dashboard
4. **Lightweight** - ~10 KB, loads instantly
5. **Portable** - Copy one file, works anywhere
6. **Debuggable** - View source to see everything

## Future Enhancements

To add more features, you can:
- Add reservation management UI
- Integrate gift card validator
- Add real-time updates
- Include table/floor plan viewer
- Add notification system

## Support

For issues or questions:
- Check browser console for errors
- Verify edge functions are deployed
- Test network requests in browser DevTools
