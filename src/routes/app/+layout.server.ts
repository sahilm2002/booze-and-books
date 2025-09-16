import { redirect } from '@sveltejs/kit';
import { ProfileServiceServer } from '$lib/services/profileServiceServer';
import { BookServiceServer } from '$lib/services/bookServiceServer';
import { SwapServiceServer } from '$lib/services/swapServiceServer';
import { NotificationServiceServer } from '$lib/services/notificationServiceServer';
import type { Book } from '$lib/types/book';
import type { LayoutServerLoad } from './$types';

// Helper function to add timeout to promises with shorter timeouts for faster loading
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 2000): Promise<T> => {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) => 
			setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
		)
	]);
};

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

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

	// Try to load profile first with timeout
	try {
		profile = await withTimeout(
			ProfileServiceServer.getProfile(locals.supabase, locals.user.id),
			1500
		);
		
		if (!profile) {
			const sanitizedUsername = ProfileServiceServer.sanitizeUsername(locals.user.email || '');
			profile = await withTimeout(
				ProfileServiceServer.createProfile(locals.supabase, locals.user.id, {
					username: sanitizedUsername,
					full_name: locals.user.email || ''
				}),
				1500
			);
		}
	} catch (profileError) {
		console.error('Failed to load/create profile:', profileError);
	}

	// Try to load book statistics with timeout
	try {
		const stats = await withTimeout(
			BookServiceServer.getBookStats(locals.supabase, locals.user.id),
			1500
		);
		bookStats = stats;
	} catch (bookError) {
		console.error('Failed to load book stats:', bookError);
	}

	// Try to load swap request counts with timeout
	try {
		swapCounts = await withTimeout(
			SwapServiceServer.getSwapRequestCounts(locals.supabase, locals.user.id),
			1500
		);
	} catch (swapCountError) {
		console.error('Failed to load swap counts:', swapCountError);
	}

	// Try to load unread notification count with timeout
	try {
		unreadNotificationCount = await withTimeout(
			NotificationServiceServer.getUnreadCount(locals.supabase, locals.user.id),
			1500
		);
	} catch (notificationError) {
		console.error('Failed to load notification count:', notificationError);
	}

	// Try to load swap statistics with timeout
	try {
		swapStatistics = await withTimeout(
			SwapServiceServer.getSwapStatistics(locals.supabase, locals.user.id),
			1500
		);
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
};
