# Installation Guide - Patschi Crew Dashboard

Complete step-by-step installation instructions.

## Prerequisites

✅ **Web Hosting Access**
- FTP/SFTP credentials, or
- cPanel/File Manager access, or
- WordPress admin access

✅ **Supabase Credentials**
- Project URL (from Supabase Dashboard → Settings → API)
- Anonymous API key (anon key from same location)

✅ **Web Browser**
- Safari, Chrome, Firefox, or Edge

## Installation Methods

### Method 1: Traditional Web Hosting (Recommended)

**Step 1: Prepare Files**

1. Extract the `crewdash-final` folder if zipped
2. Verify all files present:
   - `index.html`
   - `manifest.json`
   - `crew-icon-180.png`
   - `crew-icon-512.png`
   - `assets/` folder with 5 files

**Step 2: Configure Database Connection**

1. Open `index.html` in text editor
2. Find line 90-91:
```javascript
window.VITE_SUPABASE_URL = 'https://qwwerwkekvmaswusvgxy.supabase.co';
window.VITE_SUPABASE_ANON_KEY = 'eyJhbGc...';
```

3. Replace with YOUR credentials:
```javascript
window.VITE_SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
window.VITE_SUPABASE_ANON_KEY = 'YOUR-ANON-KEY-HERE';
```

4. Save the file

**Step 3: Upload via FTP**

1. Connect to your server using FTP client (FileZilla, Cyberduck, etc.)
2. Navigate to web root (`public_html/`, `www/`, or `htdocs/`)
3. Create folder: `crew-dashboard/` (optional)
4. Upload all files maintaining structure:
```
public_html/
└── crew-dashboard/
    ├── index.html
    ├── manifest.json
    ├── crew-icon-180.png
    ├── crew-icon-512.png
    └── assets/
        ├── main-BlIeDAjW.js
        ├── main-CQhF2cm_.css
        ├── html2canvas.esm-CBrSDip1.js
        ├── purify.es-B9ZVCkUG.js
        └── index.es-COVPnJs1.js
```

5. Set file permissions: 644 for files, 755 for folders

**Step 4: Upload via cPanel**

1. Login to cPanel
2. Open "File Manager"
3. Navigate to `public_html/`
4. Click "Upload"
5. Upload all files
6. Create `assets` folder if needed
7. Upload assets files into `assets/` folder

**Step 5: Access Dashboard**

Navigate to:
```
https://your-domain.com/crew-dashboard/index.html
```

### Method 2: WordPress Integration

**Option A: Upload to wp-content**

1. Upload to `/wp-content/crew-dashboard/`
2. Access at: `https://your-site.com/wp-content/crew-dashboard/index.html`

**Option B: Create Subdomain**

1. Create subdomain: `crew.yourdomain.com`
2. Upload files to subdomain directory
3. Access at: `https://crew.yourdomain.com/index.html`

## Testing Your Installation

### Basic Tests

1. **Load Test**
   - Open dashboard URL
   - Should see loading spinner then dashboard
   - No error messages

2. **Visual Test**
   - Floor plan visible on left
   - Calendar in center
   - Reservations on right
   - All properly styled

3. **Data Test**
   - Select today's date
   - Floor plan shows tables
   - Reservations appear in list

4. **Interactive Test**
   - Click different dates
   - Use refresh button
   - Try gift card search
   - Toggle theme

### Browser Console Check

1. Press F12 (or Right-click → Inspect)
2. Go to "Console" tab
3. Look for red errors

Common errors:
- `Failed to fetch` → Check Supabase URL/key
- `Network error` → Check internet
- `CORS error` → Verify Supabase settings
- `404` → Check file uploads

## iPad Setup

1. Open Safari on iPad
2. Navigate to dashboard URL
3. Tap Share button (top-right)
4. Select "Add to Home Screen"
5. Name it (e.g., "Patschi Crew")
6. Tap "Add"

### iPad Optimization Tips

- Use landscape mode
- Disable auto-lock: Settings → Display → Auto-Lock → Never
- Keep plugged in during service
- Optional: Enable Guided Access to lock to single app

## Troubleshooting

### Dashboard Won't Load

**Symptoms:** Blank page or endless loading

**Solutions:**
1. Check browser console (F12) for errors
2. Verify all files uploaded correctly
3. Check file permissions (644/755)
4. Clear browser cache
5. Try different browser

### No Reservations Showing

**Symptoms:** Empty floor plan or reservation list

**Solutions:**
1. Verify Supabase credentials in `index.html`
2. Check database has data for selected date
3. Verify tables exist: `rooms`, `tables`, `reservations`
4. Check RLS policies allow public read
5. Test in Supabase Dashboard

### Gift Card Verification Not Working

**Symptoms:** Search returns nothing or errors

**Solutions:**
1. Verify `gift_cards` table exists
2. Check RLS policies on table
3. Confirm gift cards exist in database
4. Check codes match exactly (case-sensitive)

### Assets Not Loading (404 Errors)

**Symptoms:** Missing styling, console shows 404s

**Solutions:**
1. Verify `assets/` folder uploaded
2. Check folder name is lowercase "assets"
3. Verify all 5 files in assets folder
4. Check file permissions (644)
5. Verify paths in `index.html`

### iPad Won't Add to Home Screen

**Symptoms:** Option missing or not working

**Solutions:**
1. Must use Safari (not Chrome)
2. Requires HTTPS (SSL certificate)
3. Verify icons exist and have correct permissions
4. Clear Safari cache
5. Restart iPad

### Auto-Refresh Not Working

**Symptoms:** Dashboard doesn't update automatically

**Solutions:**
1. Check browser console for errors
2. Verify network connectivity
3. Try manual refresh button
4. Check JavaScript enabled
5. Test in incognito mode

### Slow Performance

**Symptoms:** Laggy or slow responses

**Solutions:**
1. Check internet speed
2. Verify Supabase region proximity
3. Clear browser cache
4. Close other tabs/apps
5. Restart device

## Security Configuration

### Enable HTTPS (SSL)

Most hosting providers offer free SSL via Let's Encrypt.

1. Enable in cPanel or hosting control panel
2. Force HTTPS redirect in `.htaccess`:
```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

### Add Password Protection (Optional)

Create `.htaccess` in dashboard folder:
```apache
AuthType Basic
AuthName "Crew Access Only"
AuthUserFile /path/to/.htpasswd
Require valid-user
```

Create `.htpasswd`:
```bash
htpasswd -c .htpasswd crewuser
```

## Support Checklist

Before asking for help:

- [ ] All files uploaded correctly
- [ ] File structure matches documentation
- [ ] Supabase credentials correct
- [ ] Database has required tables
- [ ] RLS policies allow public read
- [ ] Browser console shows no errors
- [ ] SSL certificate installed
- [ ] Files have correct permissions
- [ ] Using supported browser
- [ ] Internet connection stable

## Next Steps

After installation:

1. Test all features thoroughly
2. Train staff (10 minutes)
3. Set up iPad at workstation
4. Disable auto-lock
5. Monitor during first service
6. Collect staff feedback
7. Make adjustments as needed

---

**Installation complete!** Your crew dashboard is ready. 🎉

For quick reference, see `QUICK-START.md`
For features, see `README.md`
