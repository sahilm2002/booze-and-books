/**
 * Custom JWT Authentication - Signup Endpoint
 */

import { json, type RequestEvent } from '@sveltejs/kit';
import { signUpWithCustomAuth } from '$lib/auth/customAuth';

export async function POST({ request, cookies }: RequestEvent) {
  try {
    const { email, password, full_name, username } = await request.json();

    if (!email || !password) {
      return json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Create user with custom JWT
    const result = await signUpWithCustomAuth(email, password, {
      full_name,
      username,
    });

    if (!result.success) {
      return json(
        { error: result.error || 'Registration failed' },
        { status: 400 }
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
    console.error('Signup error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
