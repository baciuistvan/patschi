# Crew App Setup Guide

This guide explains how to set up the standalone crew dashboard application that communicates with your main project via API.

## Overview

The project has been split into two parts:

1. **Main Project** - Admin dashboard + API backend (Supabase Edge Functions)
2. **Crew App** - Standalone crew dashboard (`crew-app-standalone/`)

## Part 1: Deploy API Endpoints

The API endpoints need to be deployed first. These are Supabase Edge Functions located in `supabase/functions/`:

### API Endpoints Created

1. **crew-auth** - Authentication endpoint for crew login
2. **crew-get-rooms** - Fetch rooms and tables data
3. **crew-get-reservations** - Fetch reservations by date
4. **crew-create-reservation** - Create new reservations
5. **crew-update-reservation** - Update reservation status

### Deploy the Functions

You can deploy these functions using the Supabase CLI or dashboard:

#### Option A: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to Edge Functions
3. Deploy each function from the `supabase/functions/` directory

#### Option B: Using Built-in Deployment Tools

The functions are ready to be deployed and will automatically use your Supabase environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

These are pre-configured in your Supabase environment.

### Test the API Endpoints

After deployment, test the authentication endpoint:

```bash
curl -X POST https://your-project-id.supabase.co/functions/v1/crew-auth \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'
```

If successful, you'll receive an access token.

## Part 2: Set Up the Crew App

### 1. Navigate to Crew App Directory

```bash
cd crew-app-standalone
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file:

```env
VITE_API_BASE_URL=https://your-project-id.supabase.co/functions/v1
```

Replace `your-project-id` with your actual Supabase project ID.

### 4. Run Development Server

```bash
npm run dev
```

The crew app will be available at `http://localhost:5174`

### 5. Test the Login

Use the same credentials you use for the admin dashboard:
- Email: Your crew member email
- Password: Your crew member password

The user must exist in the `admin_users` table.

## Part 3: Production Deployment

### Build the Crew App

```bash
cd crew-app-standalone
npm run build
```

### Deployment Options

The crew app is a static frontend application and can be deployed to:

1. **Vercel**
   ```bash
   vercel deploy
   ```

2. **Netlify**
   - Connect your Git repository
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Cloudflare Pages**
   - Connect repository
   - Build command: `npm run build`
   - Output directory: `dist`

4. **Custom Domain/Subdomain**
   - Deploy to `crew.yourdomain.com`
   - Upload `dist` folder contents to your web server

### Environment Variables for Production

Make sure to set the `VITE_API_BASE_URL` environment variable in your deployment platform:

**Vercel:**
```bash
vercel env add VITE_API_BASE_URL
```

**Netlify:**
Add in Settings > Build & deploy > Environment

## Architecture Benefits

### Security
- Crew app has no direct database access
- All data access is controlled through API endpoints
- JWT token-based authentication
- Service role key never exposed to frontend

### Scalability
- Crew app can be deployed independently
- API can handle multiple crew app instances
- Each can be scaled separately

### Maintenance
- Clean separation of concerns
- Crew features don't clutter admin code
- Easier to update and maintain

## API Communication Flow

```
Crew App → API Endpoint → Authentication Check → Database Query → Response
```

1. User logs in via `crew-auth` endpoint
2. Receives JWT access token
3. All subsequent requests include token in Authorization header
4. Backend validates token and processes request
5. Returns data to crew app

## Troubleshooting

### Login Fails
- Check that API_BASE_URL is correct
- Verify Edge Functions are deployed
- Ensure user exists in admin_users table
- Check browser console for errors

### Data Not Loading
- Verify authentication token is valid
- Check that functions have correct permissions
- Look at Edge Function logs in Supabase dashboard

### CORS Issues
- All endpoints include proper CORS headers
- Check that requests include correct headers
- Verify API_BASE_URL doesn't have trailing slash

## Next Steps

1. Deploy API endpoints
2. Test endpoints with curl/Postman
3. Configure crew app environment
4. Test crew app locally
5. Deploy crew app to production
6. Configure custom domain (optional)

## Support

The crew app maintains the same design language and user experience as the admin dashboard but with a focused interface optimized for crew operations.
