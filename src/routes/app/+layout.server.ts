import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	console.log('Layout server load - returning immediately with no service calls');

	// Return immediately with no service calls to test if this resolves infinite loading
	return {
		profile: null,
		user: locals.user,
		bookCount: 0,
		recentBooks: [],
		incomingSwapCount: 0,
		outgoingSwapCount: 0,
		unreadNotificationCount: 0,
		swapStatistics: {
			total_completed: 0,
			average_rating: 0,
			completion_rate: 0,
			total_swaps: 0
		}
	};
};
