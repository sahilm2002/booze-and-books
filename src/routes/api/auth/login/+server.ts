/**
 * Custom JWT Authentication - Login Endpoint
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import { signInWithCustomAuth } from '$lib/auth/customAuth';

export async function POST({ request, cookies }: RequestEvent) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Authenticate with custom JWT
    const result = await signInWithCustomAuth(email, password);

    if (!result.success) {
      return json(
        { error: result.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Set secure HTTP-only cookie with custom token
    cookies.set('custom-auth-token', result.token!, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return json({
      success: true,
      user: {
        id: result.user!.id,
        email: result.user!.email,
        user_metadata: result.user!.user_metadata,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};
