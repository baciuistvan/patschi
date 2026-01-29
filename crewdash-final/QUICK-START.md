# Quick Start - Patschi Crew Dashboard

Get your dashboard running in 5 minutes!

## What You Need

- Web hosting with file upload access
- Supabase project URL and API key
- Text editor
- Web browser

## 3-Step Installation

### Step 1: Configure (1 minute)

1. Open `index.html` in any text editor
2. Find line 90-91 (look for `window.VITE_SUPABASE_URL`)
3. Replace with your Supabase credentials:

```javascript
window.VITE_SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
window.VITE_SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';
```

4. Save the file

**Where to find credentials:**
- Login to Supabase Dashboard
- Go to Settings → API
- Copy "Project URL" and "anon public" key

### Step 2: Upload (2 minutes)

Upload ALL files to your web server:
- `index.html`
- `crew-icon-180.png`
- `crew-icon-512.png`
- `manifest.json`
- `assets/` folder with all 5 files

**Keep the folder structure intact!**

### Step 3: Test (1 minute)

1. Open browser and go to: `https://your-domain.com/path/index.html`
2. You should see:
   - Floor plan on the left
   - Calendar in the middle
   - Reservations list on the right

✅ **Working?** You're done!

## iPad Setup (Optional)

1. Open dashboard in Safari on iPad
2. Tap Share button
3. Select "Add to Home Screen"
4. Tap "Add"

Now you have a full-screen app!

## Quick Troubleshooting

**Blank page?**
- Press F12 and check console for errors
- Verify Supabase credentials are correct
- Check all files uploaded

**No reservations?**
- Verify database has data for selected date
- Check Supabase connection
- Try selecting a different date

**Gift cards not working?**
- Check `gift_cards` table exists
- Verify RLS policies enabled

## What's Next?

- Train staff (10 minutes)
- Place iPad at host station
- Monitor during first service
- Gather feedback

For detailed help, see `INSTALLATION.md`

**Total Time: ~5 minutes**
