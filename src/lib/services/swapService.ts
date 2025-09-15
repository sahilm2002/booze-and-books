// Rebuilt swap service - complete implementation with counter-offers and completion logic
// Clean, comprehensive service layer for the new swap system

import { supabase } from '$lib/supabase';
import { 
	SwapStatus,
	type SwapRequest, 
	type SwapRequestInput,
	type CounterOfferInput,
	type SwapRequestWithDetails,
	type SwapCompletion,
	type SwapStatistics,
	isValidRating,
	canUserCancelSwap,
	canUserAcceptSwap,
	canUserCreateCounterOffer,
	canUserAcceptCounterOffer,
	canUserCompleteSwap,
	canTransitionTo
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


			// Create the swap request - database trigger will handle marking books as unavailable
			const { data, error } = await supabase
				.from('swap_requests')
				.insert({
					book_id: input.book_id,
					offered_book_id: input.offered_book_id || null,
					requester_id: requesterId,
					owner_id: requestedBook.owner_id,
					message: input.message || null,
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
	 * Create a counter-offer for an existing swap request
	 */
	static async createCounterOffer(
		requestId: string, 
		userId: string, 
		counterOffer: CounterOfferInput
	): Promise<SwapRequest> {
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

			if (!canUserCreateCounterOffer(request, userId)) {
				throw new Error('You cannot create a counter-offer for this swap request');
			}

			// Validate the counter-offered book
			const { data: counterBook, error: counterBookError } = await supabase
				.from('books')
				.select('owner_id, is_available')
				.eq('id', counterOffer.counter_offered_book_id)
				.single();

			if (counterBookError) {
				throw new Error(`Counter-offered book not found: ${counterBookError.message}`);
			}

			if (counterBook.owner_id !== userId) {
				throw new Error('You can only counter-offer with books that you own');
			}

			if (!counterBook.is_available) {
				throw new Error('The counter-offered book is not available');
			}

			// Ensure counter-offered book is different from the originally requested book
			if (counterOffer.counter_offered_book_id === request.book_id) {
				throw new Error('Counter-offered book must be different from the originally requested book');
			}

			// Update the request with counter-offer
			const { data, error } = await supabase
				.from('swap_requests')
				.update({
					status: SwapStatus.COUNTER_OFFER,
					counter_offered_book_id: counterOffer.counter_offered_book_id,
					counter_offer_message: counterOffer.counter_offer_message || null
				})
				.eq('id', requestId)
				.select()
				.single();

			if (error) {
				throw new Error(`Failed to create counter-offer: ${error.message}`);
			}

			// Mark the counter-offered book as unavailable
			await supabase
				.from('books')
				.update({ is_available: false })
				.eq('id', counterOffer.counter_offered_book_id);

			return data;
		} catch (error) {
			console.error('Error creating counter-offer:', error);
			throw error;
		}
	}

	/**
	 * Accept a swap request (original or counter-offer)
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

			// Check permissions based on current status
			let canAccept = false;
			if (request.status === SwapStatus.PENDING) {
				canAccept = canUserAcceptSwap(request, userId);
			} else if (request.status === SwapStatus.COUNTER_OFFER) {
				canAccept = canUserAcceptCounterOffer(request, userId);
			}

			if (!canAccept) {
				throw new Error('You cannot accept this swap request');
			}

			// Update the status to accepted
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

			// Update the status to cancelled
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

			// Restore availability of all books involved in the swap
			const bookIds = [request.book_id]; // Always restore the requested book
			
			// Add offered book if it exists
			if (request.offered_book_id) {
				bookIds.push(request.offered_book_id);
			}
			
			// Add counter-offered book if it exists
			if (request.counter_offered_book_id) {
				bookIds.push(request.counter_offered_book_id);
			}
			
			// Filter out any null values and restore availability
			const validBookIds = bookIds.filter(id => id !== null);
			if (validBookIds.length > 0) {
				await supabase
					.from('books')
					.update({ is_available: true })
					.in('id', validBookIds);
			}

			return data;
		} catch (error) {
			console.error('Error cancelling swap request:', error);
			throw error;
		}
	}

	/**
	 * Mark a swap as completed by one party
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

			// Determine which completion fields to update
			const updateData: any = {};

			if (request.requester_id === userId) {
				updateData.requester_completed_at = new Date().toISOString();
				updateData.requester_rating = completion.rating;
				updateData.requester_feedback = completion.feedback || null;
			} else {
				updateData.owner_completed_at = new Date().toISOString();
				updateData.owner_rating = completion.rating;
				updateData.owner_feedback = completion.feedback || null;
			}

			// Update the request (trigger will handle full completion logic)
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
						id, title, authors, thumbnail_url, condition, owner_id, google_volume_id
					),
					offered_book:books!swap_requests_offered_book_id_fkey (
						id, title, authors, thumbnail_url, condition, owner_id, google_volume_id
					),
					requester_profile:profiles!swap_requests_requester_profile_fkey (
						id, username, full_name, avatar_url, location, email
					),
					owner_profile:profiles!swap_requests_owner_profile_fkey (
						id, username, full_name, avatar_url, location, email
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
						id, title, authors, thumbnail_url, condition, owner_id, google_volume_id
					),
					offered_book:books!swap_requests_offered_book_id_fkey (
						id, title, authors, thumbnail_url, condition, owner_id, google_volume_id
					),
					requester_profile:profiles!swap_requests_requester_profile_fkey (
						id, username, full_name, avatar_url, location, email
					),
					owner_profile:profiles!swap_requests_owner_profile_fkey (
						id, username, full_name, avatar_url, location, email
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
	 * Get a single swap request by ID with full details
	 */
	static async getSwapRequestById(requestId: string): Promise<SwapRequestWithDetails | null> {
		try {
			const { data, error } = await supabase
				.from('swap_requests')
				.select(`
					*,
					book:books!swap_requests_book_id_fkey (
						id, title, authors, thumbnail_url, condition, owner_id
					),
					offered_book:books!swap_requests_offered_book_id_fkey (
						id, title, authors, thumbnail_url, condition, owner_id
					),
					counter_offered_book:books!swap_requests_counter_offered_book_id_fkey (
						id, title, authors, thumbnail_url, condition, owner_id
					),
					requester_profile:profiles!swap_requests_requester_profile_fkey (
						id, username, full_name, avatar_url
					),
					owner_profile:profiles!swap_requests_owner_profile_fkey (
						id, username, full_name, avatar_url
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
			// Get all swaps for the user
			const { data: allSwaps, error: allError } = await supabase
				.from('swap_requests')
				.select('status, requester_rating, owner_rating, requester_id, owner_id')
				.or(`requester_id.eq.${userId},owner_id.eq.${userId}`);

			if (allError) {
				throw new Error(`Failed to fetch swap statistics: ${allError.message}`);
			}

			const swaps = allSwaps || [];
			const completedSwaps = swaps.filter(s => s.status === SwapStatus.COMPLETED);
			
			// Calculate ratings given TO this user (not BY this user)
			const ratingsReceived: number[] = [];
			completedSwaps.forEach(swap => {
				if (swap.requester_id === userId && swap.owner_rating !== null) {
					ratingsReceived.push(swap.owner_rating);
				} else if (swap.owner_id === userId && swap.requester_rating !== null) {
					ratingsReceived.push(swap.requester_rating);
				}
			});

			const averageRating = ratingsReceived.length > 0 
				? ratingsReceived.reduce((sum, rating) => sum + rating, 0) / ratingsReceived.length 
				: 0;

			const completionRate = swaps.length > 0 
				? (completedSwaps.length / swaps.length) * 100 
				: 0;

			return {
				total_swaps: swaps.length,
				total_completed: completedSwaps.length,
				completion_rate: Math.round(completionRate * 100) / 100,
				average_rating: Math.round(averageRating * 100) / 100
			};
		} catch (error) {
			console.error('Error fetching swap statistics:', error);
			return {
				total_swaps: 0,
				total_completed: 0,
				completion_rate: 0,
				average_rating: 0
			};
		}
	}

	/**
	 * Get available books for swapping (excludes user's own books)
	 */
	static async getAvailableBooksForSwapping(excludeUserId?: string): Promise<any[]> {
		try {
			// Simply get available books - no need to check active swaps
			// since we manage availability through the is_available flag
			let query = supabase
				.from('books')
				.select(`
					id, title, authors, thumbnail_url, condition, owner_id, created_at,
					profiles!books_owner_id_fkey (id, username, full_name, avatar_url)
				`)
				.eq('is_available', true);

			if (excludeUserId) {
				query = query.neq('owner_id', excludeUserId);
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
			// Simply get user's available books - no need to check active swaps
			// since we manage availability through the is_available flag
			const { data, error } = await supabase
				.from('books')
				.select('id, title, authors, thumbnail_url, condition, google_volume_id, description')
				.eq('owner_id', userId)
				.eq('is_available', true)
				.order('created_at', { ascending: false });

			if (error) {
				throw new Error(`Failed to fetch user's available books: ${error.message}`);
			}

			return data || [];
		} catch (error) {
			console.error('Error fetching user books:', error);
			throw error;
		}
	}

	/**
	 * Get user email addresses for contact information
	 */
	static async getUserEmails(userIds: string[]): Promise<Record<string, string>> {
		try {
			if (userIds.length === 0) return {};
			
			const { data, error } = await supabase
				.from('profiles')
				.select(`
					id,
					auth_users:auth.users!inner(email)
				`)
				.in('id', userIds);

			if (error) {
				console.error('Error fetching user emails:', error);
				return {};
			}

			const emailMap: Record<string, string> = {};
			data?.forEach((profile: any) => {
				if (profile.auth_users?.email) {
					emailMap[profile.id] = profile.auth_users.email;
				}
			});

			return emailMap;
		} catch (error) {
			console.error('Error fetching user emails:', error);
			return {};
		}
	}

	/**
	 * Get swaps that need completion reminders (one party completed >24 hours ago)
	 */
	static async getSwapsNeedingReminders(): Promise<SwapRequestWithDetails[]> {
		try {
			const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

			const { data, error } = await supabase
				.from('swap_requests')
				.select(`
					*,
					book:books!swap_requests_book_id_fkey (
						id, title, authors, thumbnail_url, condition, owner_id
					),
					offered_book:books!swap_requests_offered_book_id_fkey (
						id, title, authors, thumbnail_url, condition, owner_id
					),
					counter_offered_book:books!swap_requests_counter_offered_book_id_fkey (
						id, title, authors, thumbnail_url, condition, owner_id
					),
					requester_profile:profiles!swap_requests_requester_profile_fkey (
						id, username, full_name, avatar_url
					),
					owner_profile:profiles!swap_requests_owner_profile_fkey (
						id, username, full_name, avatar_url
					)
				`)
				.eq('status', SwapStatus.ACCEPTED)
				.is('completed_at', null)
				.or(`and(requester_completed_at.not.is.null,requester_completed_at.lt.${twentyFourHoursAgo},owner_completed_at.is.null),and(owner_completed_at.not.is.null,owner_completed_at.lt.${twentyFourHoursAgo},requester_completed_at.is.null)`);

			if (error) {
				throw new Error(`Failed to fetch swaps needing reminders: ${error.message}`);
			}

			return (data || []) as SwapRequestWithDetails[];
		} catch (error) {
			console.error('Error fetching swaps needing reminders:', error);
			return [];
		}
	}
}
