import { redirect } from '@sveltejs/kit';
import { ProfileServiceServer } from '$lib/services/profileServiceServer';
import { BookServiceServer } from '$lib/services/bookServiceServer';
import { SwapServiceServer } from '$lib/services/swapServiceServer';
import { NotificationServiceServer } from '$lib/services/notificationServiceServer';
import type { Book } from '$lib/types/book';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	try {
		// Initialize default values
		let profile = null;
		let bookStats: { bookCount: number; recentBooks: Book[] } = { bookCount: 0, recentBooks: [] };
		let swapCounts = { incomingPending: 0, outgoingPending: 0 };
		let unreadNotificationCount = 0;
		let swapStatistics = {
			total_completed: 0,
			average_rating: 0,
			completion_rate: 0,
			total_swaps: 0
		};

		// Try to load profile first
		try {
			profile = await ProfileServiceServer.getProfile(locals.supabase, locals.user.id);
			
			if (!profile) {
				const sanitizedUsername = ProfileServiceServer.sanitizeUsername(locals.user.email || '');
				profile = await ProfileServiceServer.createProfile(locals.supabase, locals.user.id, {
					username: sanitizedUsername,
					full_name: locals.user.email || ''
				});
			}
		} catch (profileError) {
			console.error('Failed to load/create profile:', profileError);
		}

		// Try to load book statistics
		try {
			const stats = await BookServiceServer.getBookStats(locals.supabase, locals.user.id);
			bookStats = stats;
		} catch (bookError) {
			console.error('Failed to load book stats:', bookError);
		}

		// Try to load swap request counts
		try {
			swapCounts = await SwapServiceServer.getSwapRequestCounts(locals.supabase, locals.user.id);
		} catch (swapCountError) {
			console.error('Failed to load swap counts:', swapCountError);
		}

		// Try to load unread notification count
		try {
			unreadNotificationCount = await NotificationServiceServer.getUnreadCount(locals.supabase, locals.user.id);
		} catch (notificationError) {
			console.error('Failed to load notification count:', notificationError);
		}

		// Try to load swap statistics
		try {
			swapStatistics = await SwapServiceServer.getSwapStatistics(locals.supabase, locals.user.id);
		} catch (swapStatsError) {
			console.error('Failed to load swap statistics:', swapStatsError);
		}

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
		console.error('Critical error in app layout:', error);
		
		// If there's a critical error, still try to return basic data
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
