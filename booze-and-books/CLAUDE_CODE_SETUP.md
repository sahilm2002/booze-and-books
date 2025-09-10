# Claude Code Historical Context & Setup Instructions

## Project Overview
**Booze & Books** is a SvelteKit + TypeScript + Supabase book swapping application that allows users to discover, offer, and swap books with each other. The application includes authentication, book management, swap request workflows, and real-time notifications.

## Current Branch Structure
- **Main branch**: Production-ready code (DO NOT COMMIT DIRECTLY)
- **v1-qodomerge**: Primary development branch (current working branch)
- **v1-bugbot, v1-coderabbit, v1-copilot, v1-diamond, v1-greptile**: Additional development branches
- **Always ask user which branch to commit to before making commits**

## Tech Stack & Architecture
- **Frontend**: SvelteKit with TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **External APIs**: Google Books API for book covers and metadata
- **Styling**: Mix of Tailwind CSS and custom CSS classes
- **Database**: PostgreSQL with Row Level Security (RLS) policies
- **Dev Server**: Runs on http://localhost:5173 (port 5173)

## Database Schema Overview
### Core Tables
- **books**: Book inventory with `google_volume_id` for covers (NOT `thumbnail_url` - removed in migration 014)
- **swap_requests**: Swap workflow management with status tracking
- **notifications**: Real-time user notifications
- **profiles**: User profile information linked to auth.users

### Important Schema Changes
- **Migration 014**: Removed `thumbnail_url` and `cover_image` columns, standardized on `google_volume_id`
- **Migration 019**: Added auto-populate trigger for `owner_id` field
- **Migration 021**: Implemented notification system with triggers
- **Migration 023**: Fixed notification trigger to use `google_volume_id` instead of `cover_image`

## Environment Configuration
```bash
# Key environment variables in .env
PUBLIC_SUPABASE_URL=https://pzmrvovqxbmobunludna.supabase.co
PUBLIC_SUPABASE_ANON_KEY=[anon_key]
SUPABASE_SERVICE_ROLE_KEY=[service_key]
SUPABASE_URL=https://pzmrvovqxbmobunludna.supabase.co
```

## Development Server Commands
```bash
npm run dev          # Start development server on port 5173
npm run build        # Build production version
npm run check        # Run type checking
npm run lint         # Run linting (if available)
```

## Critical Technical Issues Resolved

### 1. UUID Parsing Database Errors
**Problem**: `invalid input syntax for type uuid: "[object Object]"` causing constant page reloading
**Root Cause**: JavaScript objects being passed where UUID strings expected in database queries
**Solution**: Added robust UUID validation in `bookServiceServer.ts` and `bookService.ts`
**Files Fixed**: 
- `/src/lib/services/bookServiceServer.ts`
- `/src/lib/services/bookService.ts`

```typescript
// UUID validation pattern implemented
let validUserId: string;
if (!currentUserId || 
    validUserId === 'undefined' || 
    validUserId === 'null' || 
    validUserId === '[object Object]' ||
    validUserId.length !== 36) {
  throw new Error(`Invalid currentUserId format`);
}
```

### 2. Database Column References
**Problem**: Code referencing removed columns (`thumbnail_url`, `cover_image`)
**Solution**: Updated all references to use `google_volume_id`
**Files Fixed**:
- SwapService queries
- Database triggers (migration 023)
- Component image rendering logic

### 3. Button Styling Inconsistencies
**Problem**: Mixed CSS systems causing inconsistent button appearance
**Solution**: Standardized all buttons to use consistent CSS classes
**CSS Classes**:
- `.btn-primary`: Main action buttons (gradients, wine theme)
- `.btn-secondary`: Secondary actions (light background)
- `.btn-success`: Accept/confirm actions (green theme)
- `.btn-danger`: Cancel/delete actions (red theme)

### 4. Book Cover System
**How it works**:
- Books with `google_volume_id` show Google Books API covers
- Books without `google_volume_id` show placeholder icons
- URL format: `https://books.google.com/books/content?id={google_volume_id}&printsec=frontcover&img=1&zoom=1&source=gbs_api`

### 5. Hot Reload Issues
**Problem**: Changes not reflecting in browser
**Solutions**:
- Hard refresh with `Cmd+Shift+R` (macOS)
- Clear vite cache: `rm -rf node_modules/.vite`
- Restart dev server if needed

## Key Component Details

### SwapRequestCard.svelte
**Location**: `/src/components/swaps/SwapRequestCard.svelte`
**Recent Major Updates**:
1. **Button Styling**: Unified CSS classes for consistent appearance
2. **Status Badge Styling**: Matches discover page format with proper colors
3. **Spacing Fixes**: Fixed spacing between "You are offering" and book images using inline CSS
4. **Contact Information Modernization**: Complete redesign of swap approval section with:
   - Modern gradient backgrounds and card layouts
   - User avatars with placeholder fallbacks
   - Styled email buttons with hover effects
   - Next steps with clear visual hierarchy
   - Professional typography and spacing

**Critical Spacing Issue Resolution**:
- Tailwind classes (`mb-3`, `mb-4`, `mb-6`) failed to apply
- Solution: Used inline CSS `style="margin-bottom: 24px;"` which works correctly
- This pattern may be needed for other spacing issues

### Database Services
**BookServiceServer.ts**: Contains UUID validation logic for database queries
**SwapService.ts**: Updated to use `google_volume_id` instead of deprecated columns

## Swap Request Workflow
1. **PENDING**: Initial request state, owner can accept/counter-offer/cancel
2. **ACCEPTED**: Swap approved, contact information displayed, can be completed
3. **COUNTER_OFFER**: Owner offers different book, requester can accept/decline
4. **COMPLETED**: Swap finished with ratings and feedback
5. **CANCELLED**: Request cancelled by either party

## Notification System
- Real-time notifications for swap status changes
- Database triggers automatically create notifications
- Uses `google_volume_id` for book cover data in notifications
- Supports all swap workflow states

## UI/UX Standards
### Design Principles
- **Wine/Book Theme**: Deep reds (#8B2635, #722F37) with cream accents (#F5F5DC)
- **Modern Cards**: Rounded corners, shadows, hover effects
- **Consistent Spacing**: 24px between major elements
- **Status Indicators**: Color-coded badges matching context
- **Responsive Design**: Works on mobile and desktop

### macOS Development Notes
- Use `Cmd+Option+I` for Developer Tools (NOT F12)
- Use `Cmd+R` for refresh, `Cmd+Shift+R` for hard refresh
- Use `Cmd+F` for find in browser (NOT Ctrl+F)

## Common Debugging Steps
1. **Page Reloading Issues**: Check for UUID validation errors in console
2. **Missing Book Covers**: Verify `google_volume_id` exists in database
3. **Styling Not Applying**: Try hard refresh, check for CSS conflicts
4. **Database Errors**: Check migration status and column names
5. **Hot Reload Problems**: Restart dev server, clear vite cache

## Testing & Quality Assurance
- **Always run type checking**: Use `npm run check` before commits
- **Test swap workflows**: Verify all status transitions work correctly  
- **Cross-browser testing**: Ensure compatibility across browsers
- **Mobile responsiveness**: Test on different screen sizes

## Git Workflow Rules
- **NEVER commit to main branch directly**
- **Current working branch**: v1-qodomerge
- **Always ask user for branch confirmation before commits**
- **Include detailed commit messages with context**

## Database Migration Notes
- All migrations use idempotent patterns (CREATE OR REPLACE, IF NOT EXISTS)
- Triggers use `SECURITY DEFINER` for proper permissions
- Always test migrations in development before production
- Migration 023 specifically fixes notification triggers for proper column references

## Recent Feature Implementations
1. **Enhanced Swap UI**: Modern button styling and consistent layouts
2. **Contact Information Redesign**: Professional contact cards for approved swaps  
3. **Status Badge Improvements**: Consistent styling across all pages
4. **Notification System**: Real-time updates for swap status changes
5. **Book Cover Integration**: Proper Google Books API integration
6. **UUID Validation**: Robust error handling for database queries

## Known Working Features
- User authentication and profiles
- Book discovery and search
- Swap request creation and management
- Real-time notifications
- Contact information exchange
- Swap completion with ratings
- Book cover display system
- Responsive mobile design

## Current Project Status
All major features are implemented and working. The application is in a stable state with modern UI, robust error handling, and proper database integration. Recent focus has been on UI polish and user experience improvements.

## For New Claude Code Sessions
This document contains all necessary context to continue development seamlessly. Key files to reference:
- This setup file for historical context
- `/CLAUDE.md` for user preferences and rules
- `/src/components/swaps/SwapRequestCard.svelte` for UI patterns
- `/src/lib/services/` for database interaction patterns
- `/supabase/migrations/` for schema understanding

The codebase follows established patterns and conventions. When making changes, always maintain consistency with existing code style and the wine/book theme aesthetic.