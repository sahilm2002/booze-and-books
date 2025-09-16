import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
	console.log('hooks.server.ts - handle called for:', event.url.pathname);

	// TEMPORARILY DISABLE ALL AUTHENTICATION TO TEST INFINITE LOADING
	// Create minimal supabase client but don't use it
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
	}) as any; // Bypass TypeScript error for debugging

	// Set fake user to bypass authentication (using valid UUID format)
	event.locals.session = {
		access_token: 'fake',
		refresh_token: 'fake',
		expires_in: 3600,
		expires_at: Date.now() + 3600000,
		token_type: 'bearer',
		user: {
			id: '00000000-0000-0000-0000-000000000000', // Valid UUID format
			email: 'test@example.com',
			aud: 'authenticated',
			role: 'authenticated',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			app_metadata: {},
			user_metadata: {}
		}
	};
	
	event.locals.user = event.locals.session.user;

	console.log('hooks.server.ts - bypassing all auth, returning resolve');

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		},
	});
};
