import { ProfileServiceServer } from '$lib/services/profileServiceServer';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { session, supabase } }) => {
	let profile = null;

	// If user is authenticated, fetch their profile
	if (session?.user) {
		try {
			profile = await ProfileServiceServer.getProfile(supabase, session.user.id);
		} catch (error) {
			console.error('Failed to load profile:', error);
			// Don't throw error, just continue without profile
		}
	}

	return {
		session: null, // Never expose raw session with tokens
		profile,
		user: session?.user ? {
			id: session.user.id,
			email: session.user.email,
			// Only include safe user metadata fields if needed
			user_metadata: session.user.user_metadata ? {
				full_name: session.user.user_metadata.full_name,
				avatar_url: session.user.user_metadata.avatar_url
			} : {}
		} : null
	};
};
