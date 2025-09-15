import type { SupabaseClient } from '@supabase/supabase-js';
import { SwapStatus } from '../types/swap';
import type { 
	SwapRequest, 
	SwapRequestInput, 
	SwapRequestWithDetails,
	SwapCompletion
} from '../types/swap';

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

		// Try to use the atomic function first
		const { data, error } = await supabase.rpc('create_swap_request_with_availability', {
			p_book_id: input.book_id,
			p_requester_id: requesterId,
			p_owner_id: book.owner_id,
			p_message: input.message,
			p_offered_book_id: input.offered_book_id
		});

		// If RPC function works, return the result
		if (!error && data && data.length > 0) {
			return data[0]; // RPC returns array, get first item
		}

		// If RPC doesn't work, fall back to manual transaction
		console.log('RPC function failed, using manual transaction:', error?.message);
		
		// Mark both books as unavailable and create swap request atomically
		const { data: swapData, error: swapError } = await supabase
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

		if (swapError) {
			throw new Error(`Failed to create swap request: ${swapError.message}`);
		}

		// Mark requested book as unavailable
		await supabase
			.from('books')
			.update({ is_available: false })
			.eq('id', input.book_id);

		// Mark offered book as unavailable if provided
		if (input.offered_book_id) {
			await supabase
				.from('books')
				.update({ is_available: false })
				.eq('id', input.offered_book_id);
		}

		return swapData;
	}

	// Get swap requests for a user (both incoming and outgoing)
	static async getSwapRequestsForUser(
		supabase: SupabaseClient,
		userId: string
	): Promise<{
		incoming: SwapRequestWithDetails[];
		outgoing: SwapRequestWithDetails[];
	}> {
		try {
			// Use simpler queries to avoid PostgREST schema cache issues
			// Get basic swap requests first, then enrich with related data
			
			// Get incoming requests (user is the book owner) - basic fields only
			const { data: incomingBasic, error: incomingError } = await supabase
				.from('swap_requests')
				.select('*')
				.eq('owner_id', userId)
				.order('created_at', { ascending: false });

			if (incomingError) {
				throw new Error(`Failed to fetch incoming requests: ${incomingError.message}`);
			}

			// Get outgoing requests (user is the requester) - basic fields only
			const { data: outgoingBasic, error: outgoingError } = await supabase
				.from('swap_requests')
				.select('*')
				.eq('requester_id', userId)
				.order('created_at', { ascending: false });

			if (outgoingError) {
				throw new Error(`Failed to fetch outgoing requests: ${outgoingError.message}`);
			}

			// Now enrich with book and profile data using separate queries
			const incoming = await this.enrichSwapRequests(supabase, incomingBasic || [], 'incoming');
			const outgoing = await this.enrichSwapRequests(supabase, outgoingBasic || [], 'outgoing');

			return {
				incoming,
				outgoing
			};
		} catch (error) {
			// Log the actual error for debugging
			console.error('Database connection failed with detailed error:', error);
			
			// Return empty arrays as fallback
			console.warn('Using empty arrays as fallback');
			return {
				incoming: [],
				outgoing: []
			};
		}
	}

	// Helper method to enrich swap requests with book and profile data
	private static async enrichSwapRequests(
		supabase: SupabaseClient,
		requests: SwapRequest[],
		type: 'incoming' | 'outgoing'
	): Promise<SwapRequestWithDetails[]> {
		if (requests.length === 0) return [];

		// Get all unique book IDs and user IDs we need to fetch
		const bookIds = new Set<string>();
		const userIds = new Set<string>();

		requests.forEach(req => {
			bookIds.add(req.book_id);
			if (req.offered_book_id) bookIds.add(req.offered_book_id);
			userIds.add(req.requester_id);
			userIds.add(req.owner_id);
		});

		// Fetch books and profiles in parallel
		const [booksData, profilesData] = await Promise.all([
			supabase
				.from('books')
				.select('id, title, authors, google_volume_id, condition, owner_id')
				.in('id', Array.from(bookIds)),
			supabase
				.from('profiles')
				.select('id, username, full_name, avatar_url, email, location')
				.in('id', Array.from(userIds))
		]);

		// Create lookup maps
		const booksMap = new Map(booksData.data?.map(book => [book.id, book]) || []);
		const profilesMap = new Map(profilesData.data?.map(profile => [profile.id, profile]) || []);

		// Enrich requests with book and profile data
		return requests.map(req => {
			const book = booksMap.get(req.book_id) || { 
				id: req.book_id, 
				title: 'Unknown', 
				authors: [], 
				google_volume_id: null, 
				condition: 'Unknown',
				owner_id: req.owner_id
			};
			const offered_book = req.offered_book_id ? (booksMap.get(req.offered_book_id) || {
				id: req.offered_book_id,
				title: 'Unknown',
				authors: [],
				google_volume_id: null,
				condition: 'Unknown',
				owner_id: req.requester_id
			}) : null;
			const counter_offered_book = req.counter_offered_book_id ? (booksMap.get(req.counter_offered_book_id) || {
				id: req.counter_offered_book_id,
				title: 'Unknown',
				authors: [],
				google_volume_id: null,
				condition: 'Unknown',
				owner_id: req.owner_id
			}) : null;
			const requester_profile = profilesMap.get(req.requester_id) || { 
				id: req.requester_id,
				username: null, 
				full_name: null, 
				avatar_url: null, 
				email: null, 
				location: null 
			};
			const owner_profile = profilesMap.get(req.owner_id) || { 
				id: req.owner_id,
				username: null, 
				full_name: null, 
				avatar_url: null, 
				email: null, 
				location: null 
			};

			return {
				...req,
				book,
				offered_book,
				counter_offered_book,
				requester_profile: type === 'incoming' ? requester_profile : { 
					id: req.requester_id,
					username: null, 
					full_name: null, 
					avatar_url: null, 
					email: null, 
					location: null 
				},
				owner_profile: type === 'outgoing' ? owner_profile : { 
					id: req.owner_id,
					username: null, 
					full_name: null, 
					avatar_url: null, 
					email: null, 
					location: null 
				}
			} as SwapRequestWithDetails;
		});
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

		// Validate permissions based on counter-offer workflow
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
			if (request.status !== SwapStatus.PENDING && request.status !== SwapStatus.COUNTER_OFFER && request.status !== SwapStatus.ACCEPTED) {
				throw new Error('Only pending, counter-offer, or accepted requests can be cancelled');
			}
		}

		// Prepare update object
		const updateData: { status: SwapStatus; cancelled_by?: string } = { status };
		
		// If cancelling, record who cancelled it
		if (status === SwapStatus.CANCELLED) {
			updateData.cancelled_by = userId;
		}

		// Update the status
		const { data, error } = await supabase
			.from('swap_requests')
			.update(updateData)
			.eq('id', requestId)
			.select()
			.single();

		if (error) {
			throw new Error(`Failed to update swap request: ${error.message}`);
		}

		// Restore book availability when swap is cancelled or completed
		if (status === SwapStatus.CANCELLED || status === SwapStatus.COMPLETED) {
			// Mark requested book as available again
			await supabase
				.from('books')
				.update({ is_available: true })
				.eq('id', request.book_id);

			// Mark offered book as available again if it exists
			if (request.offered_book_id) {
				await supabase
					.from('books')
					.update({ is_available: true })
					.eq('id', request.offered_book_id);
			}

			// Mark counter-offered book as available again if it exists
			if (request.counter_offered_book_id) {
				await supabase
					.from('books')
					.update({ is_available: true })
					.eq('id', request.counter_offered_book_id);
			}
		}

		return data;
	}

	// Get swap request by ID
	static async getSwapRequestById(
		supabase: SupabaseClient,
		requestId: string
	): Promise<SwapRequestWithDetails | null> {
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
		try {
			// Use only current enum values to avoid errors
			const validStatuses = ['PENDING', 'ACCEPTED'];
			
			const [incomingResult, outgoingResult] = await Promise.all([
				supabase
					.from('swap_requests')
					.select('id', { count: 'exact', head: true })
					.eq('owner_id', userId)
					.in('status', validStatuses),
				
				supabase
					.from('swap_requests')
					.select('id', { count: 'exact', head: true })
					.eq('requester_id', userId)
					.in('status', validStatuses)
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
		} catch (error) {
			console.error('Error getting swap request counts:', error);
			// Return zeros as fallback
			return {
				incomingPending: 0,
				outgoingPending: 0
			};
		}
	}

	// Cancel swap request (requester only)
	static async cancelSwapRequest(
		supabase: SupabaseClient,
		requestId: string, 
		userId: string
	): Promise<SwapRequest> {
		return this.updateSwapRequestStatus(supabase, requestId, SwapStatus.CANCELLED, userId);
	}

	// Accept swap request (owner only)
	static async acceptSwapRequest(
		supabase: SupabaseClient,
		requestId: string, 
		userId: string
	): Promise<SwapRequest> {
		return this.updateSwapRequestStatus(supabase, requestId, SwapStatus.ACCEPTED, userId);
	}

	// Make counter offer (owner only)
	static async makeCounterOffer(
		supabase: SupabaseClient,
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
		supabase: SupabaseClient,
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
	static async getCompletedSwaps(
		supabase: SupabaseClient,
		userId: string
	): Promise<SwapRequestWithDetails[]> {
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
	static async getSwapStatistics(
		supabase: SupabaseClient,
		userId: string
	): Promise<{
		total_completed: number;
		average_rating: number;
		completion_rate: number;
		total_swaps: number;
	}> {
		try {
			// Get all swap requests for this user
			const { data: swaps, error } = await supabase
				.from('swap_requests')
				.select('status, requester_rating, owner_rating, requester_id, owner_id')
				.or(`requester_id.eq.${userId},owner_id.eq.${userId}`);

			if (error) {
				throw new Error(`Failed to fetch swap statistics: ${error.message}`);
			}

			if (!swaps || swaps.length === 0) {
				return {
					total_completed: 0,
					average_rating: 0,
					completion_rate: 0,
					total_swaps: 0
				};
			}

			const totalSwaps = swaps.length;
			const completedSwaps = swaps.filter(swap => swap.status === SwapStatus.COMPLETED);
			const totalCompleted = completedSwaps.length;

			// Calculate average rating received by this user
			const ratingsReceived: number[] = [];
			completedSwaps.forEach(swap => {
				if (swap.requester_id === userId && swap.owner_rating !== null) {
					ratingsReceived.push(swap.owner_rating);
				} else if (swap.owner_id === userId && swap.requester_rating !== null) {
					ratingsReceived.push(swap.requester_rating);
				}
			});

			const averageRating = ratingsReceived.length > 0 
				? ratingsReceived.reduce((a, b) => a + b, 0) / ratingsReceived.length 
				: 0;

			const completionRate = totalSwaps > 0 ? (totalCompleted / totalSwaps) * 100 : 0;

			return {
				total_completed: totalCompleted,
				average_rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
				completion_rate: Math.round(completionRate * 10) / 10, // Round to 1 decimal place
				total_swaps: totalSwaps
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
	static async getUserRating(
		supabase: SupabaseClient,
		userId: string
	): Promise<{
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
		supabase: SupabaseClient,
		requestId: string, 
		userId: string,
		completion: SwapCompletion
	): Promise<SwapRequest> {
		return this.markSwapAsCompleted(supabase, requestId, userId, completion);
	}

	// Get available books for swapping (excludes books in pending swaps)
	static async getAvailableBooksForSwapping(
		supabase: SupabaseClient,
		excludeUserId?: string
	): Promise<any[]> {
		try {
			// Simplified approach - just get available books without complex RPC calls
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

			const { data, error } = await query.order('created_at', { ascending: false });

			if (error) {
				console.error('Failed to fetch available books:', error.message);
				return [];
			}

			return data || [];
		} catch (error) {
			console.error('Error in getAvailableBooksForSwapping:', error);
			return [];
		}
	}

	// Get user's available books for offering
	static async getUserAvailableBooksForOffering(
		supabase: SupabaseClient,
		userId: string
	): Promise<any[]> {
		try {
			// Simplified approach - just get user's available books
			const { data, error } = await supabase
				.from('books')
				.select('id, title, authors, thumbnail_url, condition')
				.eq('owner_id', userId)
				.eq('is_available', true)
				.order('created_at', { ascending: false });

			if (error) {
				console.error('Failed to fetch user\'s available books:', error.message);
				return [];
			}

			return data || [];
		} catch (error) {
			console.error('Error in getUserAvailableBooksForOffering:', error);
			return [];
		}
	}
}
