import { createServerClient } from '@supabase/ssr';
import { type Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
	console.log('hooks.server.ts - minimal handle for:', event.url.pathname);

	// Create Supabase client but don't use it for authentication
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

	// COMPLETELY DISABLE SERVER-SIDE AUTHENTICATION
	// Handle all authentication client-side to avoid hanging Supabase calls
	event.locals.safeGetSession = async () => {
		console.log('safeGetSession - disabled for client-side auth');
		return { session: null, user: null };
	};

	// Set null session - let client-side handle authentication
	event.locals.session = null;
	event.locals.user = null;

	console.log('hooks.server.ts - returning resolve (no auth checks)');
	
	// Return without any authentication checks or redirects
	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		},
	});
};
