/**
 * Custom Authentication Service
 * Integrates Supabase user management with custom JWT tokens for enhanced security
 */

import { createServerClient } from '@supabase/ssr';
import { createSessionToken, validateSessionToken, type CustomJWTPayload } from './jwt.js';
import type { User } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

if (!PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required Supabase environment variables for custom auth');
}

// Create admin client for user management
const supabaseAdmin = createServerClient(
  PUBLIC_SUPABASE_URL, 
  SUPABASE_SERVICE_ROLE_KEY, 
  {
    cookies: {
      get: () => '',
      set: () => {},
      remove: () => {},
    },
  }
);

export interface CustomAuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export interface CustomSession {
  user: User;
  customToken: string;
  payload: CustomJWTPayload;
}

/**
 * Sign up a new user with custom JWT token
 */
export async function signUpWithCustomAuth(
  email: string, 
  password: string, 
  userData?: { full_name?: string; username?: string }
): Promise<CustomAuthResult> {
  try {
    // Create user in Supabase
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for custom auth
      user_metadata: userData || {},
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Failed to create user' };
    }

    // Create custom JWT token
    const customToken = createSessionToken(data.user.id, email, 'authenticated');

    return {
      success: true,
      user: data.user,
      token: customToken,
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Sign in user and return custom JWT token
 */
export async function signInWithCustomAuth(
  email: string, 
  password: string
): Promise<CustomAuthResult> {
  try {
    // Verify credentials with Supabase
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Create custom JWT token
    const customToken = createSessionToken(data.user.id, email, 'authenticated');

    return {
      success: true,
      user: data.user,
      token: customToken,
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Validate custom session token and get user data
 */
export async function validateCustomSession(token: string): Promise<CustomSession | null> {
  try {
    // Validate JWT token
    const payload = validateSessionToken(token);
    if (!payload) {
      return null;
    }

    // Get fresh user data from Supabase
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(payload.userId);
    
    if (error || !data.user) {
      return null;
    }

    return {
      user: data.user,
      customToken: token,
      payload: payload as CustomJWTPayload,
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

/**
 * Refresh custom token if needed
 */
export async function refreshCustomToken(currentToken: string): Promise<string | null> {
  try {
    const session = await validateCustomSession(currentToken);
    if (!session) {
      return null;
    }

    // Create new token
    const newToken = createSessionToken(
      session.user.id, 
      session.user.email || '', 
      'authenticated'
    );

    return newToken;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

/**
 * Get user by custom token
 */
export async function getUserFromCustomToken(token: string): Promise<User | null> {
  const session = await validateCustomSession(token);
  return session?.user || null;
}

/**
 * Sign out (invalidate token on client side)
 */
export async function signOutCustomAuth(): Promise<{ success: boolean }> {
  // With JWT tokens, we can't invalidate server-side without a blacklist
  // The client should remove the token from storage
  // For enhanced security, you could implement a token blacklist in Redis/database
  return { success: true };
}

/**
 * Update user password with custom auth
 */
export async function updatePasswordWithCustomAuth(
  userId: string, 
  newPassword: string
): Promise<CustomAuthResult> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Update user metadata with custom auth
 */
export async function updateUserMetadata(
  userId: string, 
  metadata: Record<string, any>
): Promise<CustomAuthResult> {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: metadata,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
