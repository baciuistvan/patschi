# Crew Dashboard - Easy Installation

## Quick Setup (5 Minutes)

### Step 1: Get Your Supabase URL

1. Go to your Supabase project dashboard
2. Look for your project URL - it looks like: `https://xxxxx.supabase.co`
3. Copy this URL

### Step 2: Configure the File

1. Open `crew-simple-install.html` in any text editor
2. Find line 50 (look for `SUPABASE_URL`)
3. Replace `YOUR_SUPABASE_URL_HERE` with your actual Supabase URL

Example:
```javascript
// Before:
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';

// After:
const SUPABASE_URL = 'https://abcdefgh.supabase.co';
```

### Step 3: Upload to Your Hosting

Upload `crew-simple-install.html` to your web hosting:

**Option A: Rename and use as main page**
- Rename to `index.html` or `crew.html`
- Upload to your web server via FTP/cPanel

**Option B: WordPress**
- Upload via Media Library or File Manager
- Access at: `https://yourdomain.com/crew-simple-install.html`

**Option C: Any web hosting**
- Just upload the file anywhere accessible
- Share the URL with your crew

### Step 4: Login

1. Open the file in your browser
2. Login with your crew member email and password
3. Done!

## Features

- Floor plan with real-time table status
- View all reservations by date
- Update reservation status (confirm, seat, complete, cancel)
- Auto-refreshes every 30 seconds
- Works on desktop, tablet, and mobile
- No installation required
- No dependencies

## Troubleshooting

**Login fails:**
- Check that your Supabase URL is correct
- Make sure the crew member exists in your database
- Verify the Edge Functions are deployed

**Tables not showing:**
- Check that you have tables set up in the admin panel
- Make sure tables are marked as "bookable"

**Configuration warning shows:**
- You forgot to update the SUPABASE_URL on line 50
- Open the file in a text editor and configure it

## Security Notes

- This file is safe to upload to any hosting
- It communicates with your Supabase backend via secure API
- Authentication tokens are stored in browser localStorage
- No sensitive data is stored in the file itself

## iPad / Tablet Users

This dashboard is optimized for tablet use:
- Save to home screen for app-like experience
- Touch-optimized interface
- Full-screen mode support

## Support

If you need help, check that:
1. Supabase URL is correctly configured
2. Edge Functions are deployed (`crew-auth`, `crew-get-rooms`, `crew-get-reservations`, `crew-update-reservation`)
3. Your user exists in the `admin_users` table
4. Your user has the correct role (crew or admin)
