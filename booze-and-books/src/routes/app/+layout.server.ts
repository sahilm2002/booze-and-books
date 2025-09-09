import { redirect } from '@sveltejs/kit';
import { ProfileServiceServer } from '$lib/services/profileServiceServer';
import { BookServiceServer } from '$lib/services/bookServiceServer';
import { SwapServiceServer } from '$lib/services/swapServiceServer';
import { NotificationServiceServer } from '$lib/services/notificationServiceServer';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	try {
		let profile = await ProfileServiceServer.getProfile(locals.supabase, locals.user.id);
		
		if (!profile) {
			const userEmail = locals.user.email || locals.user.id;
			const sanitizedUsername = ProfileServiceServer.sanitizeUsername(userEmail);
			profile = await ProfileServiceServer.createProfile(locals.supabase, locals.user.id, {
				username: sanitizedUsername,
				full_name: userEmail
			});
		}

		// Load book statistics for dashboard
		const bookStats = await BookServiceServer.getBookStats(locals.supabase, locals.user.id);

		// Load swap request counts
		const swapCounts = await SwapServiceServer.getSwapRequestCounts(locals.supabase, locals.user.id);

		// Load unread notification count
		const unreadNotificationCount = await NotificationServiceServer.getUnreadCount(locals.supabase, locals.user.id);

		// Load swap statistics
		const swapStatistics = await SwapServiceServer.getSwapStatistics(locals.supabase, locals.user.id);

		return {
			profile,
			user: locals.user,
			bookCount: bookStats.bookCount,
			recentBooks: bookStats.recentBooks,
			incomingSwapCount: swapCounts.incomingPending,
			outgoingSwapCount: swapCounts.outgoingPending,
			unreadNotificationCount,
			swapStatistics
		};
	} catch (error) {
		console.error('Failed to load profile:', error);
		
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
	}
};
