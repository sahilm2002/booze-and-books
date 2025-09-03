# Booze and Books

A modern book swap application inspired by historical literary societies, built with SvelteKit and Supabase.

## Setup Instructions

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- A Supabase account

### Environment Configuration

1. Copy the environment template:
   ```bash
   cd booze-and-books
   cp .env.example .env
   ```

2. Get your Supabase credentials:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Select your project (or create a new one)
   - Navigate to Settings > API
   - Copy your Project URL and Public anon key

3. Update `.env` with your actual Supabase values:
   ```env
   PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### Database Setup

1. Run all database migrations in order:
   ```sql
   -- Execute these SQL commands in your Supabase SQL Editor in order
   -- Migration 001: Create profiles table
   -- Migration 002: Create avatars bucket  
   -- Migration 003: Create books table
   -- Migration 004: Create notifications table
   -- Migration 005: Create swap requests table
   -- Migration 010: Add swap completion functionality
   -- (Copy and run each migration file from supabase/migrations/ directory)
   ```

2. Enable Row Level Security (RLS) is automatically configured by the migrations

### Development

1. Install dependencies:
   ```bash
   cd booze-and-books
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) in your browser

## Project Structure

```
booze-and-books/
├── src/
│   ├── lib/
│   │   ├── services/        # Business logic services
│   │   │   └── profileService.ts
│   │   ├── stores/          # Svelte stores for state management
│   │   │   ├── auth.ts      # Authentication store
│   │   │   └── profile.ts   # Profile data store
│   │   ├── types/           # TypeScript type definitions
│   │   │   └── profile.ts
│   │   └── supabase.ts      # Supabase client setup
│   ├── routes/
│   │   ├── app/             # Protected dashboard routes
│   │   │   ├── profile/     # Profile management pages
│   │   │   ├── +layout.svelte  # Dashboard layout
│   │   │   └── +page.svelte    # Dashboard homepage
│   │   ├── api/             # API endpoints
│   │   │   └── profile/     # Profile API routes
│   │   ├── auth/            # Authentication pages
│   │   ├── +layout.svelte   # Root layout component
│   │   └── +page.svelte     # Public homepage
│   ├── components/
│   │   ├── auth/            # Authentication components
│   │   ├── dashboard/       # Dashboard-specific components
│   │   └── profile/         # Profile management components
│   └── app.html
├── supabase/
│   └── migrations/          # Database migration files
│       ├── 001_create_profiles_table.sql
│       └── 002_create_avatars_bucket.sql
├── .env                     # Environment variables
├── package.json
└── svelte.config.js
```

## Technology Stack

- **Framework**: SvelteKit with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage (for avatar images)
- **Styling**: CSS with Svelte scoped styles and Tailwind CSS utility classes
- **Build Tool**: Vite

## Features

### ✅ Implemented
- **Authentication**: Complete sign up, sign in, and sign out system
- **User Profiles**: Avatar uploads, profile management, and user ratings
- **Book Management**: Add, edit, delete, and discover books with condition indicators
- **Swap System**: Full swap request lifecycle including completion workflow
- **Real-time Updates**: Live notifications and swap status updates
- **Rating System**: User ratings and feedback for completed swaps
- **Enhanced UI**: Historical literary society themed homepage with modern components
- **Book Details**: Comprehensive book detail pages with owner information
- **Completion Tracking**: Statistics and completion rates for users
- **Responsive Design**: Mobile-friendly interface throughout

### 🔧 Technical Features
- **Real-time Subscriptions**: Supabase real-time for live updates
- **Advanced Search**: Book discovery with filtering and conditions
- **File Uploads**: Secure avatar and book cover image handling
- **Type Safety**: Full TypeScript implementation
- **State Management**: Reactive stores with real-time integration
- **API Integration**: Google Books API for book data enrichment

## New Features (Latest Update)

### Swap Completion System
- **Completion Workflow**: Mark swaps as completed with ratings (1-5 stars)
- **Feedback System**: Optional feedback for completed swaps
- **User Ratings**: Track and display user reputation based on completed swaps
- **Completion Statistics**: Dashboard showing completion rates and average ratings

### Enhanced Book Experience
- **Book Detail Pages**: Dedicated pages with comprehensive book information
- **Condition Indicators**: Visual representations of book conditions with tooltips
- **Owner Ratings**: Display owner reputation on book detail pages
- **Enhanced Book Cards**: View Details buttons and improved condition display

### Real-time Features
- **Live Notifications**: Real-time updates for swap requests and completions
- **Connection Status**: Visual indicator showing real-time connection status
- **Instant Updates**: Immediate UI updates when swaps change status

### Historical Theming
- **Themed Homepage**: Rich content about historical literary societies
- **Literary Heritage**: Content about Kit-Cat Club, Bloomsbury Group, and Algonquin Round Table
- **Enhanced Typography**: Georgia serif fonts and elegant design elements
- **Historical Context**: Educational content about book exchange traditions

### Component Enhancements
- **Swap Completion Dialog**: Modal for rating and providing feedback
- **Real-time Status**: Connection indicator in navigation
- **User Rating Component**: Displays user ratings with breakdowns
- **Condition Indicator**: Enhanced visual condition representations

## Architecture Overview

### Database Schema

**Profiles Table (`profiles`)**:
- `id` (UUID, Primary Key, references `auth.users`)
- `username` (TEXT, Unique)
- `full_name` (TEXT)
- `bio` (TEXT)
- `location` (TEXT)
- `avatar_url` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Storage Bucket (`avatars`)**:
- Public bucket for user avatar images
- Organized by user ID folders
- Supports image uploads with automatic URL generation

### Row Level Security (RLS) Policies

- **Profiles**: Users can view all profiles but only update their own
- **Avatars**: Users can upload, update, and delete only their own avatar images
- **Public Access**: Avatar images are publicly accessible via URL

### API Endpoints

- `GET /api/profile` - Fetch current user's profile
- `PUT /api/profile` - Update current user's profile

### Components

- `ProfileCard` - Display user profile information
- `ProfileEditForm` - Edit profile details with validation
- `AvatarUpload` - Handle avatar image uploads with drag-and-drop
- `DashboardNav` - Navigation component for dashboard pages

## Contributing

This project follows SvelteKit conventions and uses TypeScript throughout. Please ensure your code passes type checking before submitting changes.

## License

MIT