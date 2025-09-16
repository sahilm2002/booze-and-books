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

	console.log('Layout server load starting for user:', locals.user.id);

	// Return minimal data to test if service calls are causing the hang
	// Temporarily disable all service calls to isolate the issue
	const profile = {
		id: locals.user.id,
		username: locals.user.email?.split('@')[0] || 'user',
		full_name: locals.user.email || 'User',
		email: locals.user.email || null,
		avatar_url: null,
		location: null,
		bio: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	};

	console.log('Layout server load completing with minimal data');

	return {
		profile,
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
