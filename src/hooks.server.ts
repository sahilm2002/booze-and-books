import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
	console.log('hooks.server.ts - handle called for:', event.url.pathname);

	// Create Supabase client with proper configuration
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
	}) as any; // Type assertion for compatibility

	// Implement safe authentication with timeout protection
	event.locals.safeGetSession = async () => {
		try {
			console.log('Getting user session with timeout protection...');
			
			// Create timeout promise (5 seconds)
			const timeoutPromise = new Promise((_, reject) => 
				setTimeout(() => reject(new Error('Authentication timeout after 5 seconds')), 5000)
			);

			// Race the auth call against timeout
			const authPromise = event.locals.supabase.auth.getUser();
			const result = await Promise.race([authPromise, timeoutPromise]) as any;
			const { data: { user }, error } = result;
			
			if (error) {
				console.error('Error getting user:', error);
				return { session: null, user: null };
			}

			// If user exists, get the session with timeout protection
			if (user) {
				console.log('User found, getting session...');
				const sessionTimeoutPromise = new Promise((_, reject) => 
					setTimeout(() => reject(new Error('Session timeout after 5 seconds')), 5000)
				);
				
				const sessionPromise = event.locals.supabase.auth.getSession();
				const sessionResult = await Promise.race([sessionPromise, sessionTimeoutPromise]) as any;
				const { data: { session }, error: sessionError } = sessionResult;
				
				if (sessionError) {
					console.error('Error getting session:', sessionError);
					return { session: null, user };
				}
				
				console.log('Session retrieved successfully');
				return { session, user };
			}

			console.log('No user found');
			return { session: null, user: null };
		} catch (error) {
			console.error('Error in safeGetSession (likely timeout):', error);
			// Return null session on timeout or error - don't block the app
			return { session: null, user: null };
		}
	};

	// Get the current session and user with timeout protection
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
			console.log('Redirecting unauthenticated user to login');
			const returnTo = encodeURIComponent(url.pathname + url.search);
			throw redirect(303, `/auth/login?redirectTo=${returnTo}`);
		}

		// Redirect authenticated users away from auth pages to dashboard
		if (isAuthRoute && session) {
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
