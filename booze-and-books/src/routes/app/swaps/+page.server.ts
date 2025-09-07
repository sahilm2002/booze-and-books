import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.supabase || !locals.session?.user) {
		throw error(401, 'Unauthorized');
	}

	// Return empty data and let the client fetch swap requests
	// This avoids server-side issues with the profiles table
	return {
		incomingRequests: [],
		outgoingRequests: []
	};
};