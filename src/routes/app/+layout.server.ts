import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { ProfileServiceServer } from '$lib/services/profileServiceServer';
import { BookServiceServer } from '$lib/services/bookServiceServer';
import { SwapServiceServer } from '$lib/services/swapServiceServer';
import { NotificationServiceServer } from '$lib/services/notificationServiceServer';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	console.log('Layout server load - starting with timeout protection');

	// Helper function to add timeout protection to service calls
	const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number = 8000): Promise<T | null> => {
		try {
			const timeoutPromise = new Promise<never>((_, reject) => 
				setTimeout(() => reject(new Error(`Service timeout after ${timeoutMs}ms`)), timeoutMs)
			);
			
			return await Promise.race([promise, timeoutPromise]);
		} catch (error) {
			console.error('Service call timed out or failed:', error);
			return null;
		}
	};

	// Load all data with timeout protection
	const [
		profile,
		bookCount,
		recentBooks,
		swapRequests,
		unreadNotificationCount,
		swapStatistics
	] = await Promise.all([
		withTimeout(ProfileServiceServer.getProfile(locals.supabase, locals.user.id)),
		withTimeout(BookServiceServer.getUserBookCount(locals.supabase, locals.user.id)),
		withTimeout(BookServiceServer.getRecentUserBooks(locals.supabase, locals.user.id, 5)),
		withTimeout(SwapServiceServer.getSwapRequestsForUser(locals.supabase, locals.user.id)),
		withTimeout(NotificationServiceServer.getUnreadCount(locals.supabase, locals.user.id)),
		withTimeout(SwapServiceServer.getSwapStatistics(locals.supabase, locals.user.id))
	]);

	console.log('Layout server load - completed successfully');

	// Calculate swap counts from swap requests
	const incomingSwapCount = swapRequests?.incoming?.length || 0;
	const outgoingSwapCount = swapRequests?.outgoing?.length || 0;

	return {
		profile,
		user: locals.user,
		bookCount: bookCount || 0,
		recentBooks: recentBooks || [],
		incomingSwapCount,
		outgoingSwapCount,
		unreadNotificationCount: unreadNotificationCount || 0,
		swapStatistics: swapStatistics || {
			total_completed: 0,
			average_rating: 0,
			completion_rate: 0,
			total_swaps: 0
		}
	};
};
