/**
 * Supabase Authentication - Logout Endpoint
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export async function POST({ cookies }: RequestEvent) {
  try {
    // Create a Supabase SSR client to clear auth cookies
    const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        get: (key) => cookies.get(key),
        set: (key, value, options) => {
          cookies.set(key, value, { ...options, path: '/' });
        },
        remove: (key, options) => {
          cookies.delete(key, { ...options, path: '/' });
        }
      }
    });

    // Sign out from Supabase (clears sb* cookies)
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('Supabase signOut error:', error.message);
    }

    // Also remove legacy custom auth cookie if present
    cookies.delete('custom-auth-token', { path: '/' });

    return json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
