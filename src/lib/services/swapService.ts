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


			// Create the swap request via API so server can orchestrate emails (onSwapCreated)
			const resp = await fetch('/api/swaps', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					book_id: input.book_id,
					offered_book_id: input.offered_book_id || null,
					message: input.message || null
				})
			});

			if (!resp.ok) {
				const errorData = await resp.json().catch(() => ({}));
				throw new Error(errorData.message || `Failed to create swap request: HTTP ${resp.status}`);
			}

			const data = await resp.json();

			// Create a chat message for the swap request using the proper chat service
			try {
				// Get both book titles for the message
				const { data: requestedBookData } = await supabase
					.from('books')
					.select('title, authors')
					.eq('id', input.book_id)
					.single();

				const requestedBookTitle = requestedBookData?.title || 'a book';
				
				let chatMessage = '';
				
				if (input.offered_book_id) {
					// Get the offered book title
					const { data: offeredBookData } = await supabase
						.from('books')
						.select('title, authors')
						.eq('id', input.offered_book_id)
						.single();
					
					const offeredBookTitle = offeredBookData?.title || 'my book';
					const requestedAuthors = Array.isArray(requestedBookData?.authors)
						? requestedBookData?.authors?.join(', ')
						: (requestedBookData?.authors || '');
					const offeredAuthors = Array.isArray(offeredBookData?.authors)
						? offeredBookData?.authors?.join(', ')
						: (offeredBookData?.authors || '');

					// Create message with both book titles and authors (if available)
					const baseMsg = `Hi! I'm interested in swapping your book, "${requestedBookTitle}"${requestedAuthors ? ` by ${requestedAuthors}` : ''}, in return for my book "${offeredBookTitle}"${offeredAuthors ? ` by ${offeredAuthors}` : ''}.`;
					chatMessage = input.message ? `${baseMsg} ${input.message}` : baseMsg;
				} else {
					// Fallback for when no specific book is offered (include authors if available)
					const requestedAuthors = Array.isArray(requestedBookData?.authors)
						? requestedBookData?.authors?.join(', ')
						: (requestedBookData?.authors || '');
					const baseMsg = `Hi! I'm interested in swapping for "${requestedBookTitle}"${requestedAuthors ? ` by ${requestedAuthors}` : ''}.`;
					chatMessage = input.message ? `${baseMsg} ${input.message}` : baseMsg;
				}

				// Generate conversation ID
				const conversationId = requesterId < requestedBook.owner_id 
					? `${requesterId}_${requestedBook.owner_id}` 
					: `${requestedBook.owner_id}_${requesterId}`;

				// Create chat message using proper structure
				await supabase
					.from('notifications')
					.insert({
						user_id: requestedBook.owner_id, // Required field for notifications table
						type: 'CHAT_MESSAGE',
						message_type: 'chat_message',
						sender_id: requesterId,
						recipient_id: requestedBook.owner_id,
						conversation_id: conversationId,
						title: 'Chat Message',
						message: chatMessage,
						data: {
							swap_request_id: data.id,
							book_id: input.book_id,
							book_title: requestedBookTitle,
							auto_generated: true
						}
					});
			} catch (chatError) {
				console.error('Failed to create chat message for swap request:', chatError);
				// Don't fail the entire swap request if chat message creation fails
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
			// Call the API endpoint so the server can orchestrate emails (onSwapApproved)
			const response = await fetch(`/api/swaps/${requestId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'ACCEPTED' })
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
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
			// Call the API endpoint so the server can orchestrate emails (onSwapCancelled)
			const response = await fetch(`/api/swaps/${requestId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
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
			// Rating is now optional - only validate if provided
			if (completion.rating !== undefined && !isValidRating(completion.rating)) {
				throw new Error('Rating must be between 1 and 5');
			}

			// Call the API endpoint instead of Supabase directly
			// This ensures EmailOrchestratorServer.onSwapCompleted gets triggered
			const response = await fetch(`/api/swaps/${requestId}`, {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(completion)
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
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
					counter_offered_book:books!swap_requests_counter_offered_book_id_fkey (
						id, title, authors, thumbnail_url, condition, owner_id, google_volume_id
					),
					requester_profile:profiles!swap_requests_requester_profile_fkey (
						id, username, full_name, avatar_url, city, state, zip_code, email
					),
					owner_profile:profiles!swap_requests_owner_profile_fkey (
						id, username, full_name, avatar_url, city, state, zip_code, email
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
					counter_offered_book:books!swap_requests_counter_offered_book_id_fkey (
						id, title, authors, thumbnail_url, condition, owner_id, google_volume_id
					),
					requester_profile:profiles!swap_requests_requester_profile_fkey (
						id, username, full_name, avatar_url, city, state, zip_code, email
					),
					owner_profile:profiles!swap_requests_owner_profile_fkey (
						id, username, full_name, avatar_url, city, state, zip_code, email
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
						id, username, full_name, avatar_url, city, state, zip_code, email
					),
					owner_profile:profiles!swap_requests_owner_profile_fkey (
						id, username, full_name, avatar_url, city, state, zip_code, email
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
					id, title, authors, google_volume_id, condition, thumbnail_url, owner_id, created_at,
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
				.select('id, email')
				.in('id', userIds);

			if (error) {
				console.error('Error fetching user emails:', error);
				return {};
			}

			const emailMap: Record<string, string> = {};
			data?.forEach((profile: any) => {
				if (profile.email) {
					emailMap[profile.id] = profile.email;
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
						id, username, full_name, avatar_url, city, state, zip_code, email
					),
					owner_profile:profiles!swap_requests_owner_profile_fkey (
						id, username, full_name, avatar_url, city, state, zip_code, email
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
