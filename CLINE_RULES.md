# Cline Rules for Booze and Books Project

## Development Server
- **Port**: **ALWAYS USE 5173** (NEVER use 3000, 4173, 5174, or other ports)
- **URL**: http://localhost:5173
- **Command**: `npm run dev`
- **Rule**: When restarting dev server, always use port 5173 - this is the established port for this project
- **Kill Command**: `pkill -f "vite|dev|5173"` (target specific port to avoid conflicts)

## Database Configuration
- **Supabase URL**: https://pzmrvovqxbmobunludna.supabase.co
- **Project uses newer Supabase key format** (not legacy service_role keys)
- **Environment variables are in .env file** (not .env.local)

## Project Structure
- **Framework**: SvelteKit
- **Database**: Supabase
- **Authentication**: Custom JWT + Supabase Auth
- **API Routes**: `/api/*` endpoints
- **App Routes**: `/app/*` (protected routes)

## Key Features
- Book swapping system
- Real-time chat and notifications
- Cocktail generation based on books
- Google Places API integration for store locator
- Profile system with city/state location

## Security Rules
- **Never expose private environment variables to browser code**
- **Google Places API calls must be server-side only**
- **Use `/api/stores/nearby` endpoint for store locator**

## Common Issues
- Profile data stored in `profiles` table
- Location field replaced with `city` and `state` columns
- Store locator uses Google Places API (not mock data)
- Daily reminder system uses custom token authentication

## Testing
- **User handles all browser testing** - DO NOT use browser_action tool
- Always test on http://localhost:5173
- Check browser console for errors
- Verify database connections work
- Test authentication flow

## Deployment
- Uses Vercel for hosting
- Environment variables configured in Vercel dashboard
- Supabase migrations applied automatically
