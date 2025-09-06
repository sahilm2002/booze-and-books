import { error } from '@sveltejs/kit';
import { SwapServiceServer } from '$lib/services/swapServiceServer';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.supabase || !locals.session?.user) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.session.user.id;

	try {
		// Get both incoming and outgoing swap requests for the user
		const { incoming, outgoing } = await SwapServiceServer.getSwapRequestsForUser(
			locals.supabase,
			userId
		);

		return {
			incomingRequests: incoming || [],
			outgoingRequests: outgoing || []
		};
	} catch (err) {
		console.error('Error loading swap requests with full details:', err);
		
		// Return empty arrays instead of throwing 500 error
		console.warn('Database error, returning empty swap requests');
		return {
			incomingRequests: [],
			outgoingRequests: []
		};
	}
};