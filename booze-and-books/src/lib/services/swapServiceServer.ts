import type { SupabaseClient } from '@supabase/supabase-js';
import type { 
	SwapRequest, 
	SwapRequestInput, 
	SwapRequestUpdate, 
	SwapRequestWithBook,
	SwapStatus 
} from '../types/swap.js';

export class SwapServiceServer {
	// Create a new swap request
	static async createSwapRequest(
		supabase: SupabaseClient, 
		input: SwapRequestInput, 
		requesterId: string
	): Promise<SwapRequest> {
		// First, get the book details to determine the owner
		const { data: book, error: bookError } = await supabase
			.from('books')
			.select('id, owner_id, is_available')
			.eq('id', input.book_id)
			.single();

		if (bookError) {
			throw new Error(`Book not found: ${bookError.message}`);
		}

		if (!book.is_available) {
			throw new Error('This book is not available for swap requests');
		}

		if (book.owner_id === requesterId) {
			throw new Error('You cannot request a swap for your own book');
		}

		// Create the swap request
		const { data, error } = await supabase
			.from('swap_requests')
			.insert({
				book_id: input.book_id,
				requester_id: requesterId,
				owner_id: book.owner_id,
				message: input.message,
				status: 'PENDING'
			})
			.select()
			.single();

		if (error) {
			throw new Error(`Failed to create swap request: ${error.message}`);
		}

		return data;
	}

	// Get swap requests for a user (both incoming and outgoing)
	static async getSwapRequestsForUser(
		supabase: SupabaseClient,
		userId: string
	): Promise<{
		incoming: SwapRequestWithBook[];
		outgoing: SwapRequestWithBook[];
	}> {
		// Get incoming requests (user is the book owner)
		const { data: incoming, error: incomingError } = await supabase
			.from('swap_requests')
			.select(`
				*,
				book:books (
					id,
					title,
					authors,
					thumbnail_url,
					condition
				),
				requester_profile:profiles!swap_requests_requester_id_profiles_fkey (
					username,
					full_name,
					avatar_url
				)
			`)
			.eq('owner_id', userId)
			.order('created_at', { ascending: false });

		if (incomingError) {
			throw new Error(`Failed to fetch incoming requests: ${incomingError.message}`);
		}

		// Get outgoing requests (user is the requester)
		const { data: outgoing, error: outgoingError } = await supabase
			.from('swap_requests')
			.select(`
				*,
				book:books (
					id,
					title,
					authors,
					thumbnail_url,
					condition
				),
				owner_profile:profiles!swap_requests_owner_id_profiles_fkey (
					username,
					full_name,
					avatar_url
				)
			`)
			.eq('requester_id', userId)
			.order('created_at', { ascending: false });

		if (outgoingError) {
			throw new Error(`Failed to fetch outgoing requests: ${outgoingError.message}`);
		}

		return {
			incoming: (incoming || []).map(req => ({
				...req,
				requester_profile: req.requester_profile,
				owner_profile: { username: null, full_name: null, avatar_url: null }
			})),
			outgoing: (outgoing || []).map(req => ({
				...req,
				requester_profile: { username: null, full_name: null, avatar_url: null },
				owner_profile: req.owner_profile
			}))
		};
	}

	// Update swap request status
	static async updateSwapRequestStatus(
		supabase: SupabaseClient,
		requestId: string, 
		status: SwapStatus, 
		userId: string
	): Promise<SwapRequest> {
		// First verify the user has permission to update this request
		const { data: request, error: fetchError } = await supabase
			.from('swap_requests')
			.select('*')
			.eq('id', requestId)
			.single();

		if (fetchError) {
			throw new Error(`Swap request not found: ${fetchError.message}`);
		}

		// Validate permissions
		if (status === 'CANCELLED' && request.requester_id !== userId) {
			throw new Error('Only the requester can cancel a swap request');
		}

		if ((status === 'ACCEPTED' || status === 'DECLINED') && request.owner_id !== userId) {
			throw new Error('Only the book owner can accept or decline a swap request');
		}

		if (request.status !== 'PENDING') {
			throw new Error('Only pending requests can be updated');
		}

		// Update the status
		const { data, error } = await supabase
			.from('swap_requests')
			.update({ status })
			.eq('id', requestId)
			.select()
			.single();

		if (error) {
			throw new Error(`Failed to update swap request: ${error.message}`);
		}

		return data;
	}

	// Get swap request by ID
	static async getSwapRequestById(
		supabase: SupabaseClient,
		requestId: string
	): Promise<SwapRequestWithBook | null> {
		const { data, error } = await supabase
			.from('swap_requests')
			.select(`
				*,
				book:books (
					id,
					title,
					authors,
					thumbnail_url,
					condition
				),
				requester_profile:profiles!swap_requests_requester_id_profiles_fkey (
					username,
					full_name,
					avatar_url
				),
				owner_profile:profiles!swap_requests_owner_id_profiles_fkey (
					username,
					full_name,
					avatar_url
				)
			`)
			.eq('id', requestId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null;
			}
			throw new Error(`Failed to fetch swap request: ${error.message}`);
		}

		return data;
	}

	// Get unread swap request counts for a user
	static async getSwapRequestCounts(
		supabase: SupabaseClient,
		userId: string
	): Promise<{
		incomingPending: number;
		outgoingPending: number;
	}> {
		const [incomingResult, outgoingResult] = await Promise.all([
			supabase
				.from('swap_requests')
				.select('id', { count: 'exact', head: true })
				.eq('owner_id', userId)
				.eq('status', 'PENDING'),
			
			supabase
				.from('swap_requests')
				.select('id', { count: 'exact', head: true })
				.eq('requester_id', userId)
				.eq('status', 'PENDING')
		]);

		if (incomingResult.error) {
			throw new Error(`Failed to count incoming requests: ${incomingResult.error.message}`);
		}

		if (outgoingResult.error) {
			throw new Error(`Failed to count outgoing requests: ${outgoingResult.error.message}`);
		}

		return {
			incomingPending: incomingResult.count || 0,
			outgoingPending: outgoingResult.count || 0
		};
	}

	// Cancel swap request (requester only)
	static async cancelSwapRequest(
		supabase: SupabaseClient,
		requestId: string, 
		userId: string
	): Promise<SwapRequest> {
		return this.updateSwapRequestStatus(supabase, requestId, 'CANCELLED', userId);
	}

	// Accept swap request (owner only)
	static async acceptSwapRequest(
		supabase: SupabaseClient,
		requestId: string, 
		userId: string
	): Promise<SwapRequest> {
		return this.updateSwapRequestStatus(supabase, requestId, 'ACCEPTED', userId);
	}

	// Decline swap request (owner only)
	static async declineSwapRequest(
		supabase: SupabaseClient,
		requestId: string, 
		userId: string
	): Promise<SwapRequest> {
		return this.updateSwapRequestStatus(supabase, requestId, 'DECLINED', userId);
	}
}