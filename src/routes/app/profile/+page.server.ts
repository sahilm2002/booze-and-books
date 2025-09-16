import { redirect } from '@sveltejs/kit';
import { ProfileServiceServer } from '$lib/services/profileServiceServer';
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async ({ locals }) => {
	const { supabase, session } = locals;

	if (!session) {
		throw redirect(303, '/auth/login?redirectTo=/app/profile');
	}

	try {
		// Load user profile
		const profile = await ProfileServiceServer.getProfile(supabase, session.user.id);
		
		// Load swap statistics
		const { data: swapStats } = await supabase
			.rpc('get_user_swap_statistics', { user_id: session.user.id });

		return {
			profile,
			swapStatistics: swapStats || {
				total_swaps: 0,
				total_completed: 0,
				completion_rate: 0,
				average_rating: 0
			}
		};
	} catch (error) {
		console.error('Error loading profile page data:', error);
		return {
			profile: null,
			swapStatistics: {
				total_swaps: 0,
				total_completed: 0,
				completion_rate: 0,
				average_rating: 0
			}
		};
	}
};
