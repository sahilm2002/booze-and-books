import { supabase } from '$lib/supabase';
import { 
	SwapStatus,
	type SwapRequest, 
	type SwapRequestInput, 
	type SwapRequestUpdate, 
	type SwapRequestWithBook,
	type SwapCompletion
} from '../types/swap.js';

export class SwapService {
	// Helper function to build profile select query based on swap status
	private static getProfileSelectQuery(includeEmail: boolean = false): string {
		const baseQuery = `
			username,
			full_name,
			avatar_url
		`;
		
		if (includeEmail) {
			return `
				username,
				full_name,
				avatar_url,
				users!profiles_id_fkey(email)
			`;
		}
		
		return baseQuery;
	}
	// Create a new swap request
	static async createSwapRequest(input: SwapRequestInput, requesterId: string): Promise<SwapRequest> {
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

		// If offered book is provided, validate it belongs to requester
		if (input.offered_book_id) {
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
		}

		// Create the swap request
		const { data, error } = await supabase
			.from('swap_requests')
			.insert({
				book_id: input.book_id,
				requester_id: requesterId,
				owner_id: book.owner_id,
				message: input.message,
				offered_book_id: input.offered_book_id,
				status: SwapStatus.PENDING
			})
			.select()
			.single();

		if (error) {
			throw new Error(`Failed to create swap request: ${error.message}`);
		}

		return data;
	}

	// Get swap requests for a user (both incoming and outgoing)
	static async getSwapRequestsForUser(userId: string): Promise<{
		incoming: SwapRequestWithBook[];
		outgoing: SwapRequestWithBook[];
	}> {
		// Get incoming requests (user is the book owner)
		const { data: incomingRaw, error: incomingError } = await supabase
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
				offered_book:books!swap_requests_offered_book_id_fkey (
					id,
					title,
					authors,
					thumbnail_url,
					condition
				),
				counter_offered_book:books!swap_requests_counter_offered_book_id_fkey (
					id,
					title,
					authors,
					thumbnail_url,
					condition
				),
				requester_profile:profiles!swap_requests_requester_id_profiles_fkey (
					${this.getProfileSelectQuery(false)}
				)
			`)
			.eq('owner_id', userId)
			.order('created_at', { ascending: false });

		if (incomingError) {
			throw new Error(`Failed to fetch incoming requests: ${incomingError.message}`);
		}

		// For ACCEPTED requests, fetch email information separately
		const acceptedIncoming = incomingRaw?.filter(req => req.status === SwapStatus.ACCEPTED) || [];
		const incomingWithEmails = await Promise.all(
			(incomingRaw || []).map(async (req) => {
				if (req.status === SwapStatus.ACCEPTED) {
					// Fetch requester email
					const { data: requesterUser } = await supabase
						.from('users')
						.select('email')
						.eq('id', req.requester_id)
						.single();

					return {
						...req,
						requester_profile: {
							...req.requester_profile,
							email: requesterUser?.email || null
						}
					};
				}
				return req;
			})
		);

		const incoming = incomingWithEmails;

		// Get outgoing requests (user is the requester)
		const { data: outgoingRaw, error: outgoingError } = await supabase
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
				offered_book:books!swap_requests_offered_book_id_fkey (
					id,
					title,
					authors,
					thumbnail_url,
					condition
				),
				counter_offered_book:books!swap_requests_counter_offered_book_id_fkey (
					id,
					title,
					authors,
					thumbnail_url,
					condition
				),
				owner_profile:profiles!swap_requests_owner_id_profiles_fkey (
					${this.getProfileSelectQuery(false)}
				)
			`)
			.eq('requester_id', userId)
			.order('created_at', { ascending: false });

		if (outgoingError) {
			throw new Error(`Failed to fetch outgoing requests: ${outgoingError.message}`);
		}

		// For ACCEPTED requests, fetch owner email information
		const outgoingWithEmails = await Promise.all(
			(outgoingRaw || []).map(async (req) => {
				if (req.status === SwapStatus.ACCEPTED) {
					// Fetch owner email
					const { data: ownerUser } = await supabase
						.from('users')
						.select('email')
						.eq('id', req.owner_id)
						.single();

					return {
						...req,
						owner_profile: {
							...req.owner_profile,
							email: ownerUser?.email || null
						}
					};
				}
				return req;
			})
		);

		const outgoing = outgoingWithEmails;

		return {
			incoming: (incoming || []).map(req => ({
				...req,
				requester_profile: req.requester_profile,
				owner_profile: { username: null, full_name: null, avatar_url: null }
			})) as SwapRequestWithBook[],
			outgoing: (outgoing || []).map(req => ({
				...req,
				requester_profile: { username: null, full_name: null, avatar_url: null },
				owner_profile: req.owner_profile
			})) as SwapRequestWithBook[]
		};
	}

	// Update swap request status
	static async updateSwapRequestStatus(
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

		// Validate permissions based on new counter-offer workflow
		if (status === SwapStatus.CANCELLED) {
			if (request.requester_id !== userId && request.owner_id !== userId) {
				throw new Error('Only swap participants can cancel a request');
			}
		}

		if (status === SwapStatus.ACCEPTED) {
			if (request.status === SwapStatus.PENDING && request.owner_id !== userId) {
				throw new Error('Only the book owner can accept a pending request');
			}
			if (request.status === SwapStatus.COUNTER_OFFER && request.requester_id !== userId) {
				throw new Error('Only the requester can accept a counter-offer');
			}
		}

		if (status === SwapStatus.COUNTER_OFFER && request.owner_id !== userId) {
			throw new Error('Only the book owner can make a counter-offer');
		}

		if (status === SwapStatus.COMPLETED && request.requester_id !== userId && request.owner_id !== userId) {
			throw new Error('Only swap participants can mark a swap as completed');
		}

		// Validate status transitions
		if (status === SwapStatus.COMPLETED && request.status !== SwapStatus.ACCEPTED) {
			throw new Error('Only accepted requests can be completed');
		} else if (status === SwapStatus.ACCEPTED) {
			if (request.status !== SwapStatus.PENDING && request.status !== SwapStatus.COUNTER_OFFER) {
				throw new Error('Only pending requests or counter-offers can be accepted');
			}
		} else if (status === SwapStatus.COUNTER_OFFER) {
			if (request.status !== SwapStatus.PENDING) {
				throw new Error('Only pending requests can receive counter-offers');
			}
		} else if (status === SwapStatus.CANCELLED) {
			if (request.status !== SwapStatus.PENDING && request.status !== SwapStatus.COUNTER_OFFER) {
				throw new Error('Only pending requests or counter-offers can be cancelled');
			}
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
	static async getSwapRequestById(requestId: string): Promise<SwapRequestWithBook | null> {
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
				offered_book:books!swap_requests_offered_book_id_fkey (
					id,
					title,
					authors,
					thumbnail_url,
					condition
				),
				counter_offered_book:books!swap_requests_counter_offered_book_id_fkey (
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
	static async getSwapRequestCounts(userId: string): Promise<{
		incomingPending: number;
		outgoingPending: number;
	}> {
		const [incomingResult, outgoingResult] = await Promise.all([
			supabase
				.from('swap_requests')
				.select('id', { count: 'exact', head: true })
				.eq('owner_id', userId)
				.in('status', [SwapStatus.PENDING, SwapStatus.COUNTER_OFFER]),
			
			supabase
				.from('swap_requests')
				.select('id', { count: 'exact', head: true })
				.eq('requester_id', userId)
				.in('status', [SwapStatus.PENDING, SwapStatus.COUNTER_OFFER])
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
	static async cancelSwapRequest(requestId: string, userId: string): Promise<SwapRequest> {
		return this.updateSwapRequestStatus(requestId, SwapStatus.CANCELLED, userId);
	}

	// Accept swap request (owner only)
	static async acceptSwapRequest(requestId: string, userId: string): Promise<SwapRequest> {
		return this.updateSwapRequestStatus(requestId, SwapStatus.ACCEPTED, userId);
	}

	// Make counter offer (owner only)
	static async makeCounterOffer(
		requestId: string, 
		userId: string, 
		counterOfferedBookId: string
	): Promise<SwapRequest> {
		// First verify the counter-offered book belongs to the user
		const { data: counterOfferedBook, error: bookError } = await supabase
			.from('books')
			.select('owner_id, is_available')
			.eq('id', counterOfferedBookId)
			.single();

		if (bookError) {
			throw new Error(`Counter-offered book not found: ${bookError.message}`);
		}

		if (counterOfferedBook.owner_id !== userId) {
			throw new Error('You can only offer books that you own');
		}

		if (!counterOfferedBook.is_available) {
			throw new Error('The counter-offered book is not available');
		}

		// Update the swap request with counter-offer
		const { data: request, error: fetchError } = await supabase
			.from('swap_requests')
			.select('*')
			.eq('id', requestId)
			.single();

		if (fetchError) {
			throw new Error(`Swap request not found: ${fetchError.message}`);
		}

		if (request.status !== SwapStatus.PENDING) {
			throw new Error('Only pending requests can receive counter-offers');
		}

		if (request.owner_id !== userId) {
			throw new Error('Only the book owner can make a counter-offer');
		}

		const { data, error } = await supabase
			.from('swap_requests')
			.update({ 
				status: SwapStatus.COUNTER_OFFER,
				counter_offered_book_id: counterOfferedBookId
			})
			.eq('id', requestId)
			.select()
			.single();

		if (error) {
			throw new Error(`Failed to make counter-offer: ${error.message}`);
		}

		return data;
	}

	// Mark swap as completed with rating and feedback
	static async markSwapAsCompleted(
		requestId: string, 
		userId: string,
		completion: SwapCompletion
	): Promise<SwapRequest> {
		// First verify the request can be completed
		const { data: request, error: fetchError } = await supabase
			.from('swap_requests')
			.select('*')
			.eq('id', requestId)
			.single();

		if (fetchError) {
			throw new Error(`Swap request not found: ${fetchError.message}`);
		}

		if (request.status !== SwapStatus.ACCEPTED) {
			throw new Error('Only accepted requests can be completed');
		}

		if (request.requester_id !== userId && request.owner_id !== userId) {
			throw new Error('Only swap participants can mark a swap as completed');
		}

		// Determine if user is requester or owner and set appropriate rating
		const updateData: any = {
			status: SwapStatus.COMPLETED,
			completion_date: new Date().toISOString()
		};

		if (request.requester_id === userId) {
			updateData.requester_rating = completion.rating;
			updateData.requester_feedback = completion.feedback;
		} else {
			updateData.owner_rating = completion.rating;
			updateData.owner_feedback = completion.feedback;
		}

		const { data, error } = await supabase
			.from('swap_requests')
			.update(updateData)
			.eq('id', requestId)
			.select()
			.single();

		if (error) {
			throw new Error(`Failed to complete swap: ${error.message}`);
		}

		return data;
	}

	// Get completed swaps for a user
	static async getCompletedSwaps(userId: string): Promise<SwapRequestWithBook[]> {
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
				offered_book:books!swap_requests_offered_book_id_fkey (
					id,
					title,
					authors,
					thumbnail_url,
					condition
				),
				counter_offered_book:books!swap_requests_counter_offered_book_id_fkey (
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
			.eq('status', SwapStatus.COMPLETED)
			.or(`requester_id.eq.${userId},owner_id.eq.${userId}`)
			.order('completion_date', { ascending: false });

		if (error) {
			throw new Error(`Failed to fetch completed swaps: ${error.message}`);
		}

		return data || [];
	}

	// Get swap statistics for a user
	static async getSwapStatistics(userId: string): Promise<{
		total_completed: number;
		average_rating: number;
		completion_rate: number;
		total_swaps: number;
	}> {
		try {
			const { data, error } = await supabase.rpc('get_user_completion_stats', {
				user_id: userId
			});

			if (error) {
				throw new Error(`Failed to fetch swap statistics: ${error.message}`);
			}

			if (!data || data.length === 0) {
				return {
					total_completed: 0,
					average_rating: 0,
					completion_rate: 0,
					total_swaps: 0
				};
			}

			return {
				total_completed: data[0].total_completed || 0,
				average_rating: parseFloat(data[0].average_rating || '0'),
				completion_rate: parseFloat(data[0].completion_rate || '0'),
				total_swaps: data[0].total_swaps || 0
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

	// Get user's rating from other users' perspective
	static async getUserRating(userId: string): Promise<{
		average_rating: number;
		total_ratings: number;
		ratings_breakdown: { [key: number]: number };
	}> {
		const { data, error } = await supabase
			.from('swap_requests')
			.select('requester_rating, owner_rating, requester_id, owner_id')
			.eq('status', SwapStatus.COMPLETED)
			.or(`requester_id.eq.${userId},owner_id.eq.${userId}`)
			.or('requester_rating.not.is.null,owner_rating.not.is.null');

		if (error) {
			throw new Error(`Failed to fetch user ratings: ${error.message}`);
		}

		const ratings: number[] = [];
		const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

		data?.forEach(swap => {
			// Get the rating given TO this user (not BY this user)
			if (swap.requester_id === userId && swap.owner_rating !== null) {
				ratings.push(swap.owner_rating);
				breakdown[swap.owner_rating as keyof typeof breakdown]++;
			} else if (swap.owner_id === userId && swap.requester_rating !== null) {
				ratings.push(swap.requester_rating);
				breakdown[swap.requester_rating as keyof typeof breakdown]++;
			}
		});

		return {
			average_rating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
			total_ratings: ratings.length,
			ratings_breakdown: breakdown
		};
	}

	// Complete swap request (both parties can use this)
	static async completeSwapRequest(
		requestId: string, 
		userId: string,
		completion: SwapCompletion
	): Promise<SwapRequest> {
		return this.markSwapAsCompleted(requestId, userId, completion);
	}

	// Get available books for swapping (excludes books in pending swaps)
	static async getAvailableBooksForSwapping(excludeUserId?: string): Promise<any[]> {
		// Get books that are not involved in pending swaps
		const { data: booksInPendingSwaps, error: pendingError } = await supabase
			.rpc('get_books_in_pending_swaps');

		if (pendingError) {
			console.warn('Failed to get pending swap books:', pendingError.message);
		}

		const excludedBookIds = booksInPendingSwaps?.map((row: any) => row.book_id) || [];

		let query = supabase
			.from('books')
			.select(`
				id,
				title,
				authors,
				thumbnail_url,
				condition,
				owner_id,
				created_at,
				profiles!books_owner_id_fkey (
					username,
					full_name,
					avatar_url
				)
			`)
			.eq('is_available', true);

		if (excludeUserId) {
			query = query.neq('owner_id', excludeUserId);
		}

		if (excludedBookIds.length > 0) {
			query = query.not('id', 'in', `(${excludedBookIds.join(',')})`);
		}

		const { data, error } = await query.order('created_at', { ascending: false });

		if (error) {
			throw new Error(`Failed to fetch available books: ${error.message}`);
		}

		return data || [];
	}

	// Get user's available books for offering
	static async getUserAvailableBooksForOffering(userId: string): Promise<any[]> {
		// Get books that are not involved in pending swaps
		const { data: booksInPendingSwaps, error: pendingError } = await supabase
			.rpc('get_books_in_pending_swaps');

		if (pendingError) {
			console.warn('Failed to get pending swap books:', pendingError.message);
		}

		const excludedBookIds = booksInPendingSwaps?.map((row: any) => row.book_id) || [];

		let query = supabase
			.from('books')
			.select('id, title, authors, thumbnail_url, condition')
			.eq('owner_id', userId)
			.eq('is_available', true);

		if (excludedBookIds.length > 0) {
			query = query.not('id', 'in', `(${excludedBookIds.join(',')})`);
		}

		const { data, error } = await query.order('created_at', { ascending: false });

		if (error) {
			throw new Error(`Failed to fetch user's available books: ${error.message}`);
		}

		return data || [];
	}
}