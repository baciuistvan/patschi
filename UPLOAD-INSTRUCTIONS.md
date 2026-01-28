# Patschi Backend - Upload Instructions

## 📦 What You Need to Upload

To access the Patschi Backend (Admin Dashboard) from your own hosting, you need to upload these files:

```
your-hosting-directory/
├── patschi-admin-standalone.html   (Main admin file)
└── assets/
    ├── main-iIkZ58rm.js           (Main application bundle - 665 KB)
    ├── index-CkqYLCe_.js          (Dependencies - 295 KB)
    ├── index-BgdVVETA.css         (Styles - 49 KB)
    ├── purify.es-sOfw8HaZ.js      (Security - 23 KB)
    ├── index.es-Tks8TIO7.js       (Utilities - 150 KB)
    └── html2canvas.esm-CBrSDip1.js (PDF generation - 201 KB)
```

## 🚀 Upload Steps

### Option 1: Upload via FTP/SFTP

1. **Connect to your hosting** using an FTP client (FileZilla, WinSCP, etc.)

2. **Create a directory** for the admin panel (e.g., `/public_html/patschi-admin/`)

3. **Upload the files:**
   - Upload `patschi-admin-standalone.html` to the root of your directory
   - Create an `assets` folder
   - Upload all files from the `assets/` folder into this directory

4. **Set permissions** (if needed):
   - Files: 644
   - Folders: 755

5. **Access your admin panel:**
   ```
   https://yourdomain.com/patschi-admin/patschi-admin-standalone.html
   ```

### Option 2: Upload via cPanel File Manager

1. **Log in to cPanel**

2. **Open File Manager** and navigate to `public_html` or your web root

3. **Create a new folder** called `patschi-admin`

4. **Upload files:**
   - Click "Upload" and select `patschi-admin-standalone.html`
   - Create a folder called `assets`
   - Enter the `assets` folder and upload all asset files

5. **Access your admin panel:**
   ```
   https://yourdomain.com/patschi-admin/patschi-admin-standalone.html
   ```

### Option 3: Using a Subdomain

1. **Create a subdomain** in your hosting panel (e.g., `admin.yourdomain.com`)

2. **Upload files to the subdomain root:**
   - Upload `patschi-admin-standalone.html` (you can rename it to `index.html`)
   - Upload the `assets/` folder

3. **Access your admin panel:**
   ```
   https://admin.yourdomain.com/
   ```

## 🔐 Security Recommendations

### 1. Password Protection (Recommended)

Add `.htaccess` password protection to your admin directory:

**Create `.htaccess` file:**
```apache
AuthType Basic
AuthName "Patschi Admin Access"
AuthUserFile /full/path/to/.htpasswd
Require valid-user
```

**Create `.htpasswd` file:**
Use an online htpasswd generator or run:
```bash
htpasswd -c .htpasswd admin
```

### 2. IP Restriction (Optional)

Restrict access to specific IP addresses in `.htaccess`:
```apache
Order deny,allow
Deny from all
Allow from YOUR.IP.ADDRESS.HERE
Allow from ANOTHER.IP.ADDRESS
```

### 3. HTTPS Only (Highly Recommended)

Ensure your hosting has an SSL certificate and redirect HTTP to HTTPS.

Add to `.htaccess`:
```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

## ⚙️ Configuration

### Supabase Connection

The Supabase credentials are embedded in the JavaScript bundles. If you need to change them:

1. Update the `.env` file in the project root
2. Rebuild the project: `npm run build`
3. Re-upload the new `assets/main-iIkZ58rm.js` file

### File Paths

If you upload to a subdirectory, you may need to adjust asset paths:

In `patschi-admin-standalone.html`, change:
```html
<script type="module" crossorigin src="./assets/main-iIkZ58rm.js"></script>
```

To absolute paths:
```html
<script type="module" crossorigin src="/patschi-admin/assets/main-iIkZ58rm.js"></script>
```

## 🧪 Testing

After upload, test these functions:

1. ✅ **Login** - Can you log in with your admin credentials?
2. ✅ **Reservations** - Can you see and manage reservations?
3. ✅ **Gift Cards** - Can you create and manage gift cards?
4. ✅ **Settings** - Can you access and modify settings?
5. ✅ **Floor Plan** - Does the floor plan display correctly?

## 🔧 Troubleshooting

### Problem: Blank Page or "Failed to load module"

**Solution:** Check that all asset files are uploaded and paths are correct.

### Problem: "Invalid Supabase URL"

**Solution:** Your Supabase credentials are not configured. Rebuild with correct `.env` values.

### Problem: Can't log in

**Solution:**
1. Check your Supabase database is accessible
2. Verify admin user exists in `admin_users` table
3. Check RLS policies are enabled

### Problem: "404 Not Found" on assets

**Solution:**
1. Verify assets folder is uploaded
2. Check file permissions (should be 644)
3. Verify paths in HTML file match your directory structure

## 📱 Mobile Access

The admin panel is fully responsive. You can bookmark it on your phone:

**iOS (Safari):**
1. Open the admin URL
2. Tap the Share button
3. Select "Add to Home Screen"

**Android (Chrome):**
1. Open the admin URL
2. Tap the menu (3 dots)
3. Select "Add to Home screen"

## 🆘 Support

If you encounter issues:

1. Check browser console for errors (F12 → Console tab)
2. Verify all files are uploaded correctly
3. Test in a different browser
4. Clear browser cache and try again

## 📋 File Checklist

Before uploading, make sure you have:

- [ ] `patschi-admin-standalone.html`
- [ ] `assets/main-iIkZ58rm.js`
- [ ] `assets/index-CkqYLCe_.js`
- [ ] `assets/index-BgdVVETA.css`
- [ ] `assets/purify.es-sOfw8HaZ.js`
- [ ] `assets/index.es-Tks8TIO7.js`
- [ ] `assets/html2canvas.esm-CBrSDip1.js`

## 🎯 Quick Start Summary

1. Upload `patschi-admin-standalone.html` and `assets/` folder
2. Set up password protection (recommended)
3. Access via your URL
4. Log in with your admin credentials
5. Start managing your restaurant!

---

**Need to rebuild?** Run `npm run build` in the project directory and upload the new files from the `dist/` folder.
