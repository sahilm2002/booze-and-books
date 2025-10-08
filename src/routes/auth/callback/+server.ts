import type { RequestHandler } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

/**
 * OAuth callback handler for Supabase Auth (PKCE code exchange).
 * Exchanges the `code` for a server-side session cookie and then redirects to `next`.
 *
 * Example: /auth/callback?code=...&next=/app
 */
export const GET: RequestHandler = async ({ url, locals, request }) => {
  const code = url.searchParams.get('code');
  let next = url.searchParams.get('next') ?? '/app';
  // Prevent open redirect
  if (!next.startsWith('/')) next = '/app';

  if (code) {
    const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Prefer forwarded host in front of reverse proxies/load balancers
      const forwardedHost = request.headers.get('x-forwarded-host');
      if (forwardedHost) {
        throw redirect(303, `https://${forwardedHost}${next}`);
      }
      throw redirect(303, `${url.origin}${next}`);
    }
  }

  // On error (or missing code), send user back to login
  throw redirect(303, `${url.origin}/auth/login`);
};
