import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
	console.log('hooks.server.ts - handle called for:', event.url.pathname);

	// Create Supabase client
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			get: (key) => event.cookies.get(key),
			set: (key, value, options) => {
				event.cookies.set(key, value, { ...options, path: '/' });
			},
			remove: (key, options) => {
				event.cookies.delete(key, { ...options, path: '/' });
			},
		},
	}) as any;

	// COMPLETELY BYPASS SUPABASE AUTH CALLS - use cookie-based session only
	event.locals.safeGetSession = async () => {
		console.log('safeGetSession - bypassing Supabase calls entirely');
		return { session: null, user: null };
	};

	// Check for existing session cookie instead of calling Supabase
	const sessionCookie = event.cookies.get('sb-access-token') || event.cookies.get('supabase-auth-token');
	
	if (sessionCookie) {
		console.log('Found session cookie, creating minimal user object');
		// Create minimal user object from cookie presence
		event.locals.session = {
			access_token: sessionCookie,
			refresh_token: 'cookie-based',
			expires_in: 3600,
			expires_at: Date.now() + 3600000,
			token_type: 'bearer',
			user: {
				id: 'cookie-user-' + Math.random().toString(36).substr(2, 9),
				email: 'user@example.com',
				aud: 'authenticated',
				role: 'authenticated',
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				app_metadata: {},
				user_metadata: {}
			}
		} as any;
		event.locals.user = event.locals.session.user;
	} else {
		console.log('No session cookie found');
		event.locals.session = null;
		event.locals.user = null;
	}

	// Route protection logic
	const url = new URL(event.request.url);
	const pathname = url.pathname;

	// Skip protection for SvelteKit internal requests and API routes
	const isInternalRequest = pathname.includes('__data.json') || pathname.startsWith('/api/');
	
	if (!isInternalRequest) {
		// Protected routes that require authentication
		const protectedMatchers = [/^\/app(\/|$)/, /^\/dashboard(\/|$)/];
		const isProtectedRoute = protectedMatchers.some((re) => re.test(pathname));

		// Auth routes that should redirect if already authenticated
		const authRoutes = ['/auth/login', '/auth/signup'];
		const isAuthRoute = authRoutes.includes(pathname);

		// Redirect unauthenticated users away from protected routes
		if (isProtectedRoute && !event.locals.session) {
			console.log('Redirecting unauthenticated user to login');
			const returnTo = encodeURIComponent(url.pathname + url.search);
			throw redirect(303, `/auth/login?redirectTo=${returnTo}`);
		}

		// Redirect authenticated users away from auth pages to dashboard
		if (isAuthRoute && event.locals.session && event.locals.user) {
			console.log('Redirecting authenticated user to app');
			throw redirect(303, '/app');
		}
	}

	console.log('hooks.server.ts - returning resolve');
	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		},
	});
};
