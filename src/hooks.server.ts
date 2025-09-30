import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
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
	});

	/**
	 * A convenience helper so we can just call await getSession() instead const { data: { session } } = await supabase.auth.getSession()
	 */
	event.locals.safeGetSession = async () => {
		try {
			// Try to get session with a more aggressive timeout and better error handling
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
			
			try {
				const { data: { session }, error } = await event.locals.supabase.auth.getSession();
				clearTimeout(timeoutId);
				
				if (error) {
					console.error('Session error:', error);
					return { session: null, user: null };
				}
				
				return { session, user: session?.user || null };
			} catch (authError) {
				clearTimeout(timeoutId);
				console.error('Auth call failed:', authError);
				return { session: null, user: null };
			}
		} catch (error) {
			console.error('Error in safeGetSession:', error);
			return { session: null, user: null };
		}

		return {
			session,
			user: session?.user ?? null,
		};
	};

	// Get the current session and user
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	// Route protection logic
	const url = new URL(event.request.url);
	const pathname = url.pathname;

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