/**
 * Custom JWT Authentication - Logout Endpoint
 */

import { json, type RequestEvent } from '@sveltejs/kit';

export async function POST({ cookies }: RequestEvent) {
  try {
    // Remove the custom auth token cookie
    cookies.delete('custom-auth-token', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    return json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
