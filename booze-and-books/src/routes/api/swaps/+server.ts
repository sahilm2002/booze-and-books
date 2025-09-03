import { json, error } from '@sveltejs/kit';
import { SwapServiceServer } from '$lib/services/swapServiceServer';
import { validateSwapRequestInput } from '$lib/validation/swap';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.session?.user) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.session.user.id;

	try {
		const { incoming, outgoing } = await SwapServiceServer.getSwapRequestsForUser(
			locals.supabase,
			userId
		);

		return json({
			incoming,
			outgoing
		});
	} catch (err) {
		console.error('Error fetching swap requests:', err);
		throw error(500, 'Failed to fetch swap requests');
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.session?.user) {
		throw error(401, 'Unauthorized');
	}

	const userId = locals.session.user.id;
	let requestData;

	try {
		requestData = await request.json();
	} catch (err) {
		throw error(400, 'Invalid JSON');
	}

	// Validate request data
	const validation = validateSwapRequestInput(requestData);
	if (!validation.success) {
		throw error(400, {
			message: 'Invalid request data',
			errors: validation.errors
		});
	}

	try {
		const swapRequest = await SwapServiceServer.createSwapRequest(
			locals.supabase,
			validation.data,
			userId
		);

		return json(swapRequest, { status: 201 });
	} catch (err) {
		console.error('Error creating swap request:', err);
		const message = err instanceof Error ? err.message : 'Failed to create swap request';
		
		if (message.includes('not available') || message.includes('own book')) {
			throw error(400, message);
		}
		
		throw error(500, message);
	}
};