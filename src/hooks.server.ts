import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
	/**
	 * Creates a Supabase client specific to this server request.
	 * 
	 * The Supabase client is configured to:
	 * - Use cookies for session management
	 * - Allow session refreshing
	 * - Handle authentication state server-side
	 */
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
	});

	/**
	 * Simplified authentication using only Supabase
	 * Removed custom JWT to avoid serverless issues
	 */
	event.locals.safeGetSession = async () => {
		try {
			// Use standard Supabase authentication only
			const { data: { user }, error } = await event.locals.supabase.auth.getUser();
			
			if (error) {
				console.error('Error getting user:', error);
				return { session: null, user: null };
			}

			// If user exists, get the session for additional data
			if (user) {
				const { data: { session }, error: sessionError } = await event.locals.supabase.auth.getSession();
				if (sessionError) {
					console.error('Error getting session after user verification:', sessionError);
					return { session: null, user };
				}
				return { session, user };
			}

			return { session: null, user: null };
		} catch (error) {
			console.error('Error in safeGetSession:', error);
			return { session: null, user: null };
		}
	};

	// Get the current session and user
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

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
		if (isProtectedRoute && !session) {
			const returnTo = encodeURIComponent(url.pathname + url.search);
			throw redirect(303, `/auth/login?redirectTo=${returnTo}`);
		}

		// Redirect authenticated users away from auth pages to dashboard
		if (isAuthRoute && session) {
			throw redirect(303, '/app');
		}
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			/**
			 * Supabase libraries use the `content-range` and `x-supabase-api-version`
			 * headers, so we need to tell SvelteKit to pass it through.
			 */
			return name === 'content-range' || name === 'x-supabase-api-version';
		},
	});
};
