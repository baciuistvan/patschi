# Quick Start - Crew Dashboard

## What You Need

1. Supabase project with deployed Edge Functions
2. Crew member account in the database
3. Node.js installed

## 5-Minute Setup

### Step 1: Configure Environment

Create `.env`:
```env
VITE_API_BASE_URL=https://YOUR_PROJECT_ID.supabase.co/functions/v1
```

### Step 2: Install & Run

```bash
npm install
npm run dev
```

### Step 3: Login

Open `http://localhost:5174` and log in with your crew credentials.

## That's It!

You should now see:
- Floor plan with table status
- Calendar for date selection
- List of reservations
- Ability to create new reservations

## Need Help?

See `README.md` for detailed documentation.
See `../CREW-APP-SETUP-GUIDE.md` for deployment instructions.
