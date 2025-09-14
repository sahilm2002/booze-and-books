// Clean, bug-free swap service
// Built from scratch with proper error handling and validation

import { supabase } from '$lib/supabase';
import { 
	SwapStatus,
	type SwapRequest, 
	type SwapRequestInput, 
	type SwapRequestWithDetails,
	type SwapCompletion,
	type SwapStatistics,
	isValidRating,
	canUserCancelSwap,
	canUserAcceptSwap,
	canUserCompleteSwap
} from '$lib/types/swap';

export class SwapService {
	/**
	 * Create a new swap request
	 */
	static async createSwapRequest(input: SwapRequestInput, requesterId: string): Promise<SwapRequest> {
		try {
			// Validate the requested book exists and is available
			const { data: requestedBook, error: bookError } = await supabase
				.from('books')
				.select('id, owner_id, is_available')
				.eq('id', input.book_id)
				.single();

			if (bookError) {
				throw new Error(`Requested book not found: ${bookError.message}`);
			}

			if (!requestedBook.is_available) {
				throw new Error('This book is not available for swap requests');
			}

			if (requestedBook.owner_id === requesterId) {
				throw new Error('You cannot request a swap for your own book');
			}

			// Validate the offered book (REQUIRED)
			if (!input.offered_book_id) {
				throw new Error('You must offer one of your own books in exchange');
			}

			const { data: offeredBook, error: offeredBookError } = await supabase
				.from('books')
				.select('owner_id, is_available')
				.eq('id', input.offered_book_id)
				.single();

			if (offeredBookError) {
				throw new Error(`Offered book not found: ${offeredBookError.message}`);
			}

			if (offeredBook.owner_id !== requesterId) {
				throw new Error('You can only offer books that you own');
			}

			if (!offeredBook.is_available) {
				throw new Error('The offered book is not available');
			}

			// Check for existing pending request
			const { data: existingRequest } = await supabase
				.from('swap_requests')
				.select('id')
				.eq('book_id', input.book_id)
				.eq('requester_id', requesterId)
				.eq('status', SwapStatus.PENDING)
				.single();

			if (existingRequest) {
				throw new Error('You already have a pending request for this book');
			}

			// Create the swap request
			const { data, error } = await supabase
				.from('swap_requests')
				.insert({
					book_id: input.book_id,
					requester_id: requesterId,
					owner_id: requestedBook.owner_id,
					message: input.message || null,
					offered_book_id: input.offered_book_id || null,
					status: SwapStatus.PENDING
				})
				.select()
				.single();

			if (error) {
				throw new Error(`Failed to create swap request: ${error.message}`);
			}

			return data;
		} catch (error) {
			console.error('Error creating swap request:', error);
			throw error;
		}
	}

	/**
	 * Get swap requests for a user (both incoming and outgoing)
	 */
	static async getSwapRequestsForUser(userId: string): Promise<{
		incoming: SwapRequestWithDetails[];
		outgoing: SwapRequestWithDetails[];
	}> {
		try {
			// Get incoming requests (user is the book owner)
			const { data: incoming, error: incomingError } = await supabase
				.from('swap_requests')
				.select(`
					*,
					book:books!swap_requests_book_id_fkey (
						id, title, authors, thumbnail_url, condition
					),
					offered_book:books!swap_requests_offered_book_id_fkey (
						id, title, authors, thumbnail_url, condition
					),
					requester_profile:profiles!swap_requests_requester_id_fkey (
						username, full_name, avatar_url
					),
					owner_profile:profiles!swap_requests_owner_id_fkey (
						username, full_name, avatar_url
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
					book:books!swap_requests_book_id_fkey (
						id, title, authors, thumbnail_url, condition
					),
					offered_book:books!swap_requests_offered_book_id_fkey (
						id, title, authors, thumbnail_url, condition
					),
					requester_profile:profiles!swap_requests_requester_id_fkey (
						username, full_name, avatar_url
					),
					owner_profile:profiles!swap_requests_owner_id_fkey (
						username, full_name, avatar_url
					)
				`)
				.eq('requester_id', userId)
				.order('created_at', { ascending: false });

			if (outgoingError) {
				throw new Error(`Failed to fetch outgoing requests: ${outgoingError.message}`);
			}

			return {
				incoming: (incoming || []) as SwapRequestWithDetails[],
				outgoing: (outgoing || []) as SwapRequestWithDetails[]
			};
		} catch (error) {
			console.error('Error fetching swap requests:', error);
			throw error;
		}
	}

	/**
	 * Accept a swap request (owner only)
	 */
	static async acceptSwapRequest(requestId: string, userId: string): Promise<SwapRequest> {
		try {
			// Get the current request
			const { data: request, error: fetchError } = await supabase
				.from('swap_requests')
				.select('*')
				.eq('id', requestId)
				.single();

			if (fetchError) {
				throw new Error(`Swap request not found: ${fetchError.message}`);
			}

			if (!canUserAcceptSwap(request, userId)) {
				throw new Error('You cannot accept this swap request');
			}

			// Update the status
			const { data, error } = await supabase
				.from('swap_requests')
				.update({ status: SwapStatus.ACCEPTED })
				.eq('id', requestId)
				.select()
				.single();

			if (error) {
				throw new Error(`Failed to accept swap request: ${error.message}`);
			}

			return data;
		} catch (error) {
			console.error('Error accepting swap request:', error);
			throw error;
		}
	}

	/**
	 * Cancel a swap request
	 */
	static async cancelSwapRequest(requestId: string, userId: string): Promise<SwapRequest> {
		try {
			// Get the current request
			const { data: request, error: fetchError } = await supabase
				.from('swap_requests')
				.select('*')
				.eq('id', requestId)
				.single();

			if (fetchError) {
				throw new Error(`Swap request not found: ${fetchError.message}`);
			}

			if (!canUserCancelSwap(request, userId)) {
				throw new Error('You cannot cancel this swap request');
			}

			// Update the status
			const { data, error } = await supabase
				.from('swap_requests')
				.update({ 
					status: SwapStatus.CANCELLED,
					cancelled_by: userId
				})
				.eq('id', requestId)
				.select()
				.single();

			if (error) {
				throw new Error(`Failed to cancel swap request: ${error.message}`);
			}

			return data;
		} catch (error) {
			console.error('Error cancelling swap request:', error);
			throw error;
		}
	}

	/**
	 * Complete a swap request with rating and feedback
	 */
	static async completeSwapRequest(
		requestId: string, 
		userId: string,
		completion: SwapCompletion
	): Promise<SwapRequest> {
		try {
			if (!isValidRating(completion.rating)) {
				throw new Error('Rating must be between 1 and 5');
			}

			// Get the current request
			const { data: request, error: fetchError } = await supabase
				.from('swap_requests')
				.select('*')
				.eq('id', requestId)
				.single();

			if (fetchError) {
				throw new Error(`Swap request not found: ${fetchError.message}`);
			}

			if (!canUserCompleteSwap(request, userId)) {
				throw new Error('You cannot complete this swap request');
			}

			// Determine which rating field to update
			const updateData: any = {
				status: SwapStatus.COMPLETED,
				completed_at: new Date().toISOString()
			};

			if (request.requester_id === userId) {
				updateData.requester_rating = completion.rating;
				updateData.requester_feedback = completion.feedback || null;
			} else {
				updateData.owner_rating = completion.rating;
				updateData.owner_feedback = completion.feedback || null;
			}

			// Update the request
			const { data, error } = await supabase
				.from('swap_requests')
				.update(updateData)
				.eq('id', requestId)
				.select()
				.single();

			if (error) {
				throw new Error(`Failed to complete swap request: ${error.message}`);
			}

			return data;
		} catch (error) {
			console.error('Error completing swap request:', error);
			throw error;
		}
	}

	/**
	 * Get a single swap request by ID
	 */
	static async getSwapRequestById(requestId: string): Promise<SwapRequestWithDetails | null> {
		try {
			const { data, error } = await supabase
				.from('swap_requests')
				.select(`
					*,
					book:books!swap_requests_book_id_fkey (
						id, title, authors, thumbnail_url, condition
					),
					offered_book:books!swap_requests_offered_book_id_fkey (
						id, title, authors, thumbnail_url, condition
					),
					requester_profile:profiles!swap_requests_requester_id_fkey (
						username, full_name, avatar_url
					),
					owner_profile:profiles!swap_requests_owner_id_fkey (
						username, full_name, avatar_url
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

			return data as SwapRequestWithDetails;
		} catch (error) {
			console.error('Error fetching swap request:', error);
			throw error;
		}
	}

	/**
	 * Get swap statistics for a user
	 */
	static async getSwapStatistics(userId: string): Promise<SwapStatistics> {
		try {
			// Get all completed swaps for the user
			const { data: completedSwaps, error } = await supabase
				.from('swap_requests')
				.select('requester_rating, owner_rating, requester_id, owner_id')
				.eq('status', SwapStatus.COMPLETED)
				.or(`requester_id.eq.${userId},owner_id.eq.${userId}`);

			if (error) {
				throw new Error(`Failed to fetch swap statistics: ${error.message}`);
			}

			// Get total swaps (all statuses)
			const { count: totalSwaps, error: countError } = await supabase
				.from('swap_requests')
				.select('*', { count: 'exact', head: true })
				.or(`requester_id.eq.${userId},owner_id.eq.${userId}`);

			if (countError) {
				throw new Error(`Failed to count total swaps: ${countError.message}`);
			}

			const completed = completedSwaps || [];
			const ratings: number[] = [];

			// Collect ratings given TO this user (not BY this user)
			completed.forEach(swap => {
				if (swap.requester_id === userId && swap.owner_rating !== null) {
					ratings.push(swap.owner_rating);
				} else if (swap.owner_id === userId && swap.requester_rating !== null) {
					ratings.push(swap.requester_rating);
				}
			});

			const averageRating = ratings.length > 0 
				? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
				: 0;

			const completionRate = totalSwaps && totalSwaps > 0 
				? (completed.length / totalSwaps) * 100 
				: 0;

			return {
				total_completed: completed.length,
				average_rating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
				completion_rate: Math.round(completionRate * 100) / 100, // Round to 2 decimal places
				total_swaps: totalSwaps || 0
			};
		} catch (error) {
			console.error('Error fetching swap statistics:', error);
			return {
				total_completed: 0,
				average_rating: 0,
				completion_rate: 0,
				total_swaps: 0
			};
		}
	}

	/**
	 * Get available books for swapping (excludes user's own books and books in active swaps)
	 */
	static async getAvailableBooksForSwapping(excludeUserId?: string): Promise<any[]> {
		try {
			// Get books that are currently in active swaps
			const { data: activeSwaps } = await supabase
				.from('swap_requests')
				.select('book_id, offered_book_id')
				.in('status', [SwapStatus.PENDING, SwapStatus.ACCEPTED]);

			const busyBookIds = new Set<string>();
			activeSwaps?.forEach(swap => {
				if (swap.book_id) busyBookIds.add(swap.book_id);
				if (swap.offered_book_id) busyBookIds.add(swap.offered_book_id);
			});

			// Build query
			let query = supabase
				.from('books')
				.select(`
					id, title, authors, thumbnail_url, condition, owner_id, created_at,
					profiles!books_owner_id_fkey (username, full_name, avatar_url)
				`)
				.eq('is_available', true);

			if (excludeUserId) {
				query = query.neq('owner_id', excludeUserId);
			}

			if (busyBookIds.size > 0) {
				query = query.not('id', 'in', `(${Array.from(busyBookIds).join(',')})`);
			}

			const { data, error } = await query.order('created_at', { ascending: false });

			if (error) {
				throw new Error(`Failed to fetch available books: ${error.message}`);
			}

			return data || [];
		} catch (error) {
			console.error('Error fetching available books:', error);
			throw error;
		}
	}

	/**
	 * Get user's available books for offering in swaps
	 */
	static async getUserAvailableBooksForOffering(userId: string): Promise<any[]> {
		try {
			// Get books that are currently in active swaps
			const { data: activeSwaps } = await supabase
				.from('swap_requests')
				.select('book_id, offered_book_id')
				.in('status', [SwapStatus.PENDING, SwapStatus.ACCEPTED]);

			const busyBookIds = new Set<string>();
			activeSwaps?.forEach(swap => {
				if (swap.book_id) busyBookIds.add(swap.book_id);
				if (swap.offered_book_id) busyBookIds.add(swap.offered_book_id);
			});

			// Build query
			let query = supabase
				.from('books')
				.select('id, title, authors, thumbnail_url, condition')
				.eq('owner_id', userId)
				.eq('is_available', true);

			if (busyBookIds.size > 0) {
				query = query.not('id', 'in', `(${Array.from(busyBookIds).join(',')})`);
			}

			const { data, error } = await query.order('created_at', { ascending: false });

			if (error) {
				throw new Error(`Failed to fetch user's available books: ${error.message}`);
			}

			return data || [];
		} catch (error) {
			console.error('Error fetching user books:', error);
			throw error;
		}
	}
}
