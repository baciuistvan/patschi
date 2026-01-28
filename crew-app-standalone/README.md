# Crew Dashboard - Standalone Application

A standalone crew dashboard application that connects to the main reservation system via API.

## Features

- Secure login for crew members
- Real-time floor plan visualization
- Calendar-based reservation viewing
- Create new reservations
- View table availability
- Dark mode support
- Multi-language support (English/German)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=https://your-project-id.supabase.co/functions/v1
```

Replace `your-project-id` with your actual Supabase project ID.

### 3. Deploy API Endpoints (Backend)

Before running the crew app, make sure the API endpoints are deployed in your main project:

- `crew-auth` - Authentication endpoint
- `crew-get-rooms` - Get rooms and tables
- `crew-get-reservations` - Get reservations
- `crew-create-reservation` - Create new reservations
- `crew-update-reservation` - Update reservation status

These should be deployed as Supabase Edge Functions in the main project.

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5174`

### 5. Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. Log in with your crew credentials (same as admin dashboard)
2. Select a date to view reservations
3. Switch between rooms to see different floor plans
4. Click on tables to see booking status
5. Create new reservations using the + button

## Architecture

This application is completely separate from the admin dashboard and communicates only through secure API endpoints. It never has direct database access, which provides:

- Better security
- Easier deployment and scaling
- Cleaner separation of concerns
- Can be hosted on different infrastructure

## API Communication

All API calls are made through the `apiService` which handles:

- Authentication token management
- Automatic token refresh
- Error handling
- Request/response formatting

## Development

The app uses:

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Lucide React for icons

## Deployment Options

- Static hosting (Vercel, Netlify, Cloudflare Pages)
- Any web server
- Can be deployed to a subdomain (crew.yourdomain.com)
- Can be packaged as a standalone app

## Security

- JWT token-based authentication
- Tokens stored securely in localStorage
- All API requests include authentication headers
- No direct database access
- Read-only access to sensitive data
