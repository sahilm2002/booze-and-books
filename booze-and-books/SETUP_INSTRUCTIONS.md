# Booze & Books - Setup Instructions

## Project Overview
Booze & Books is a modern web application for book enthusiasts to manage their personal book collections and swap books with other users. The application features a comprehensive book swap system with counter-offers, real-time updates, and email notifications.

## Technology Stack
- **Frontend**: SvelteKit with TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Real-time, Storage)
- **Styling**: Custom CSS with modern design patterns
- **Validation**: Zod for schema validation
- **External APIs**: Google Books API for book search

## Prerequisites
- Node.js (v18 or later)
- npm or yarn
- Supabase account and project
- Google Books API key (optional, for enhanced book search)

## Initial Setup

### 1. Environment Configuration
Create a `.env` file in the project root with the following variables:
```env
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_BOOKS_API_KEY=your_google_books_api_key
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Supabase Setup
The project uses Supabase for backend services. The database schema includes:

#### Core Tables
- `profiles` - User profile information
- `books` - User book collections
- `swap_requests` - Book swap requests with counter-offer support
- `notifications` - In-app notification system

#### Key Database Functions
- `get_books_in_pending_swaps()` - Helper function to exclude books in active swaps from discovery

### 4. Run Database Migrations
Execute the following migrations in order:

1. **001_initial_schema.sql** - Basic tables and RLS policies
2. **002_create_books_table.sql** - Books table with full-text search
3. **003_create_swap_requests_table.sql** - Swap requests system
4. **004_add_book_availability.sql** - Book availability tracking
5. **005_add_swap_completion.sql** - Swap completion with ratings
6. **006_add_book_thumbnails.sql** - Book cover thumbnails
7. **007_create_notifications_table.sql** - Notification system
8. **008_update_books_thumbnail_field.sql** - Thumbnail field updates
9. **009_add_google_books_integration.sql** - Google Books API integration
10. **010_add_book_genre_condition.sql** - Genre and condition fields
11. **011_add_unique_google_book_constraint.sql** - Prevent duplicate Google Books
12. **012_add_profiles_email_field.sql** - Email field for notifications
13. **013_add_swap_request_offered_book.sql** - Offered book support
14. **014_update_swap_requests_with_profiles.sql** - Enhanced profile joins
15. **015_add_counter_offer_functionality.sql** - Complete counter-offer system

### 5. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Recent Implementation Updates

### Counter-Offer System (Latest Update)
A comprehensive counter-offer system has been implemented with the following features:

#### Database Changes
- **New Enum Values**: `COUNTER_OFFER` status added to `swap_status` enum (replacing `DECLINED`)
- **New Columns**: 
  - `offered_book_id` - Book offered by requester
  - `counter_offered_book_id` - Book counter-offered by owner
- **Helper Function**: `get_books_in_pending_swaps()` to filter unavailable books
- **Enhanced RLS Policies**: Updated for new counter-offer workflow

#### API Endpoints
- **POST** `/api/swaps` - Create swap requests with offered books
- **GET** `/api/swaps` - List incoming/outgoing swap requests
- **GET** `/api/swaps/[id]` - Get specific swap request details
- **PUT** `/api/swaps/[id]` - Update swap request status
- **PATCH** `/api/swaps/[id]` - Complete swap with rating/feedback
- **DELETE** `/api/swaps/[id]` - Cancel swap request
- **POST** `/api/swaps/[id]/counter-offer` - Make counter-offer (NEW)

#### UI Components
1. **BookSelectionModal.svelte** - Modal for selecting books to offer
2. **SwapRequestCard.svelte** - Enhanced with counter-offer workflow
3. **BookCard.svelte** - Integrated swap request functionality
4. **Discovery Page** - Real-time filtering of available books

#### Key Features
- **Counter-Offer Workflow**: Owners can propose different books
- **Email Integration**: Contact information revealed when swaps are accepted
- **Real-time Updates**: Automatic refresh when book availability changes
- **Enhanced Filtering**: Books in pending swaps excluded from discovery

#### Status Flow
```
PENDING → ACCEPTED → COMPLETED
    ↓
COUNTER_OFFER → ACCEPTED → COMPLETED
    ↓
CANCELLED
```

### Real-time Features
- **Book Discovery**: Automatically updates when books become available/unavailable
- **Swap Requests**: Live status updates across all components
- **Notification System**: Real-time in-app notifications

### Email Notification System
- **Swap Approval**: Notifies both parties when requests are accepted
- **Counter-Offers**: Alerts requesters of counter-proposals
- **Contact Sharing**: Email addresses only visible when swaps are accepted

## Development Guidelines

### Code Organization
```
src/
├── lib/
│   ├── components/          # Reusable Svelte components
│   ├── services/           # API service layers
│   ├── stores/             # Svelte stores for state management
│   ├── types/              # TypeScript type definitions
│   ├── validation/         # Zod validation schemas
│   └── utils/              # Utility functions
├── routes/                 # SvelteKit routes
└── app.html               # Main app template
```

### Key Services
- **BookService/BookServiceServer** - Book management operations
- **SwapService/SwapServiceServer** - Swap request handling
- **NotificationService** - In-app and email notifications
- **RealtimeService** - WebSocket subscriptions for live updates
- **GoogleBooksService** - External API integration

### State Management
- **Auth Store** - User authentication state
- **Books Store** - Book collections and discovery
- **Swaps Store** - Swap requests and statistics
- **Notifications Store** - Notification management

## Production Deployment

### Environment Variables
Ensure all production environment variables are configured:
- Supabase production URL and keys
- Google Books API key
- Any additional service credentials

### Build Process
```bash
npm run build
```

### Deployment Platforms
The application is configured for:
- **Vercel** (primary) - with `vercel.json` configuration
- **Netlify** - with `_headers` and `_redirects` files
- **Static hosting** - via SvelteKit adapter

## Testing

### Manual Testing Checklist
1. **User Registration/Login** - Auth flow with Supabase
2. **Book Management** - Add, edit, delete books
3. **Book Discovery** - Search and filter available books
4. **Swap Requests** - Create, accept, counter-offer, complete
5. **Real-time Updates** - Verify live updates across components
6. **Email Notifications** - Test notification delivery
7. **Mobile Responsiveness** - Test on various screen sizes

### API Testing
All API endpoints include comprehensive error handling:
- **400** - Invalid request data
- **401** - Unauthorized access
- **403** - Forbidden operations
- **404** - Resource not found
- **500** - Server errors

## Troubleshooting

### Common Issues
1. **Supabase Connection** - Verify environment variables
2. **Migration Errors** - Ensure migrations run in correct order
3. **Real-time Issues** - Check WebSocket connections
4. **Email Notifications** - Verify SMTP configuration
5. **Google Books API** - Check API key and quotas

### Debug Mode
Enable debug logging:
```bash
DEBUG=* npm run dev
```

## Future Enhancements
- Book condition verification system
- Advanced recommendation engine
- Mobile app development
- Enhanced email templates
- Book club features
- Reading progress tracking

## Support
For issues or questions:
1. Check the browser console for errors
2. Verify Supabase connection and permissions
3. Review API endpoint responses
4. Test with simplified data sets

---

**Last Updated**: September 2025
**Version**: 2.0 (Counter-Offer System Implementation)