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
		session,
		profile
	};
};