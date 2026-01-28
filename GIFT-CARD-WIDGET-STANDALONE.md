# Standalone Gift Card Widget

A self-contained HTML file for purchasing and verifying gift cards.

## Features

- **Purchase Gift Cards**: Buy gift cards with preset or custom amounts
- **Verify Gift Cards**: Check gift card validity and balance
- **PDF Download**: Download gift card PDFs directly
- **Responsive Design**: Works on all devices
- **Full Gift Card Details**: View all information including redemption history
- **Stripe Integration**: Secure payment processing

## Setup Instructions

### 1. Configure Supabase Connection

Open `gift-card-standalone.html` and update these values on lines 24-25:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Replace with your actual Supabase project URL and anonymous key.

### 2. Upload to Web Server

Upload the `gift-card-standalone.html` file to your web server or hosting platform.

### 3. Embed in WordPress (Optional)

#### Option A: Full Page

1. Create a new page in WordPress
2. Add a Custom HTML block
3. Paste the following code:

```html
<iframe
  src="https://your-domain.com/gift-card-standalone.html"
  style="width: 100%; min-height: 800px; border: none;"
  title="Gift Card Widget"
></iframe>
```

#### Option B: Inline Integration

1. Install a plugin like "Insert Headers and Footers" or "Custom HTML"
2. Copy the entire content of `gift-card-standalone.html`
3. Paste it into your page or post

### 4. Direct Link

Share the direct URL:
```
https://your-domain.com/gift-card-standalone.html
```

## Features Breakdown

### Purchase Flow

1. Select preset amount (€50, €100, €200) or enter custom amount
2. Add recipient information (optional)
3. Add buyer information (required)
4. Add personal message (optional)
5. Complete Stripe checkout
6. Receive gift card via email

### Verification Flow

1. Enter barcode number
2. View complete gift card details:
   - Code and barcode
   - Original amount and current balance
   - Expiry date and status
   - Recipient information
   - Personal message
   - Redemption history
3. Download PDF

## Customization

### Styling

The widget uses Tailwind CSS via CDN. To customize colors:

1. Locate the color classes (e.g., `bg-green-600`, `text-green-700`)
2. Replace with your brand colors
3. Update the gradient background in the `<style>` section

### Amounts

Change preset amounts by modifying line 28:

```javascript
const PRESET_AMOUNTS = [50, 100, 200];
```

Change minimum amount by modifying line 29:

```javascript
const MIN_AMOUNT = 10;
```

### Language

All text is in German. To translate:

1. Search for text strings (e.g., "Gutschein kaufen")
2. Replace with your language
3. Update date formatting in `toLocaleDateString('de-DE')` calls

## Requirements

- Supabase project with gift card system configured
- Stripe account with payment links enabled
- Web server or hosting platform

## Security Notes

- Uses Supabase RLS (Row Level Security) for data protection
- Stripe handles all payment processing securely
- No sensitive data stored in the widget
- Anonymous key is safe for public use

## Support

For issues or questions, check:

1. Browser console for errors
2. Supabase logs for database errors
3. Stripe dashboard for payment issues

## File Structure

```
gift-card-standalone.html (single file, no dependencies)
├── Tailwind CSS (CDN)
├── Supabase JS (CDN)
├── jsPDF (CDN)
└── html2canvas (CDN)
```

All dependencies loaded from CDN - no npm install required!

## Browser Compatibility

- Chrome/Edge: ✓
- Firefox: ✓
- Safari: ✓
- Mobile browsers: ✓

## Testing

1. **Test Purchase**: Use Stripe test mode with test card numbers
2. **Test Verification**: Create a test gift card in admin dashboard
3. **Test PDF**: Verify PDF downloads correctly in all browsers

## Quick Start Checklist

- [ ] Update Supabase URL and key
- [ ] Upload file to web server
- [ ] Test purchase flow with Stripe test mode
- [ ] Test verification with existing gift card
- [ ] Test PDF download
- [ ] Embed in your website
- [ ] Switch Stripe to live mode

## Additional Features

The widget includes:

- Real-time form validation
- Loading states and error messages
- Responsive design for mobile/tablet/desktop
- Accessibility features
- Clean, modern UI

## Maintenance

No maintenance required! The widget:

- Has no server-side code to maintain
- Updates automatically via CDN dependencies
- Works entirely client-side
- Requires no database migrations

Perfect for non-technical users who want a simple, plug-and-play solution!
