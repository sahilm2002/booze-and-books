import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

/**
 * Creates a Supabase client configured for browser-side operations.
 * 
 * This client is optimized for:
 * - Client-side authentication operations (login, signup, logout)
 * - Real-time subscriptions
 * - Browser cookie management
 * - Session state changes
 */
export const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);