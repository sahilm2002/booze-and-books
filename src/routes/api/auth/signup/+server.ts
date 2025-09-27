/**
 * Supabase Authentication - Signup Endpoint (no custom JWT)
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

export async function POST({ request, cookies }: RequestEvent) {
  try {
    const { email, password, full_name, username } = await request.json();

    if (!email || !password) {
      return json({ error: 'Email and password are required' }, { status: 400 });
    }

    // 1) Create user using service role and auto-confirm (replicates previous behavior)
    if (!PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase env for admin createUser');
      return json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createServerClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      cookies: {
        get: () => '',
        set: () => {},
        remove: () => {}
      }
    });

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || undefined,
        username: username || undefined
      }
    });

    if (createErr || !created?.user) {
      return json({ error: createErr?.message || 'Registration failed' }, { status: 400 });
    }

    // 2) Sign in the user to set Supabase auth cookies (SSR client with anon key)
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

    const { data: signedIn, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInErr || !signedIn?.user) {
      // User exists but failed to sign in; still return 200 to let UI guide next step
      return json({
        success: true,
        user: {
          id: created.user.id,
          email: created.user.email,
          user_metadata: created.user.user_metadata
        },
        message: 'Account created. Please sign in.'
      });
    }

    // Clean up any legacy custom auth cookie if present
    cookies.delete('custom-auth-token', { path: '/' });

    return json({
      success: true,
      user: {
        id: signedIn.user.id,
        email: signedIn.user.email,
        user_metadata: signedIn.user.user_metadata
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
