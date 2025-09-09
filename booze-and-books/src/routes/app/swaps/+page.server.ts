import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	// Return empty data and let the client fetch swap requests
	// This avoids server-side issues and uses cached user from locals
	return {
		incomingRequests: [],
		outgoingRequests: []
	};
};