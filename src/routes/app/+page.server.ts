import { redirect } from '@sveltejs/kit';
import { BookServiceServer } from '$lib/services/bookServiceServer';
import { SwapServiceServer } from '$lib/services/swapServiceServer';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	try {
		// Load user's book statistics for dashboard
		const bookStats = await BookServiceServer.getBookStats(locals.supabase, locals.user.id);
		
		// Load user's swap statistics including actual ratings
		const swapStats = await SwapServiceServer.getSwapStatistics(locals.supabase, locals.user.id);

		return {
			bookCount: bookStats.bookCount,
			recentBooks: bookStats.recentBooks,
			swapStatistics: swapStats
		};
	} catch (error) {
		console.error('Failed to load dashboard data:', error);
		
		// Return default data if there's an error
		return {
			bookCount: 0,
			recentBooks: [],
			swapStatistics: {
				total_completed: 0,
				completion_rate: 0,
				average_rating: 0,
				total_swaps: 0
			}
		};
	}
};