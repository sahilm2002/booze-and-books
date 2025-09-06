import type { SupabaseClient } from '@supabase/supabase-js';
import { SwapStatus } from '../types/swap.js';
import type { 
	SwapRequest, 
	SwapRequestInput, 
	SwapRequestUpdate, 
	SwapRequestWithBook,
	SwapCompletion
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
	static async getSwapRequestsForUser(
		supabase: SupabaseClient,
		userId: string
	): Promise<{
		incoming: SwapRequestWithBook[];
		outgoing: SwapRequestWithBook[];
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
	): Promise<SwapRequestWithBook[]> {
		if (requests.length === 0) return [];

		// Get all unique book IDs and user IDs we need to fetch
		const bookIds = new Set<string>();
		const userIds = new Set<string>();

		requests.forEach(req => {
			bookIds.add(req.book_id);
			userIds.add(req.requester_id);
			userIds.add(req.owner_id);
		});

		// Fetch books and profiles in parallel
		const [booksData, profilesData] = await Promise.all([
			supabase
				.from('books')
				.select('id, title, authors, thumbnail_url, condition')
				.in('id', Array.from(bookIds)),
			supabase
				.from('profiles')
				.select('id, username, full_name, avatar_url')
				.in('id', Array.from(userIds))
		]);

		// Create lookup maps
		const booksMap = new Map(booksData.data?.map(book => [book.id, book]) || []);
		const profilesMap = new Map(profilesData.data?.map(profile => [profile.id, profile]) || []);

		// Enrich requests with book and profile data
		return requests.map(req => {
			const book = booksMap.get(req.book_id) || null;
			const requester_profile = profilesMap.get(req.requester_id) || { username: null, full_name: null, avatar_url: null };
			const owner_profile = profilesMap.get(req.owner_id) || { username: null, full_name: null, avatar_url: null };

			return {
				...req,
				book,
				requester_profile: type === 'incoming' ? requester_profile : { username: null, full_name: null, avatar_url: null },
				owner_profile: type === 'outgoing' ? owner_profile : { username: null, full_name: null, avatar_url: null }
			} as SwapRequestWithBook;
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

		// Validate permissions
		if (status === SwapStatus.CANCELLED && request.requester_id !== userId) {
			throw new Error('Only the requester can cancel a swap request');
		}

		if ((status === SwapStatus.ACCEPTED || status === SwapStatus.DECLINED) && request.owner_id !== userId) {
			throw new Error('Only the book owner can accept or decline a swap request');
		}

		if (status === SwapStatus.COMPLETED && request.requester_id !== userId && request.owner_id !== userId) {
			throw new Error('Only swap participants can mark a swap as completed');
		}

		// Validate status transitions
		if (status === SwapStatus.COMPLETED && request.status !== SwapStatus.ACCEPTED) {
			throw new Error('Only accepted requests can be completed');
		} else if (status !== SwapStatus.COMPLETED && request.status !== SwapStatus.PENDING) {
			throw new Error('Only pending requests can be accepted, declined, or cancelled');
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
		try {
			const [incomingResult, outgoingResult] = await Promise.all([
				supabase
					.from('swap_requests')
					.select('id', { count: 'exact', head: true })
					.eq('owner_id', userId)
					.eq('status', SwapStatus.PENDING),
				
				supabase
					.from('swap_requests')
					.select('id', { count: 'exact', head: true })
					.eq('requester_id', userId)
					.eq('status', SwapStatus.PENDING)
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

	// Decline swap request (owner only)
	static async declineSwapRequest(
		supabase: SupabaseClient,
		requestId: string, 
		userId: string
	): Promise<SwapRequest> {
		return this.updateSwapRequestStatus(supabase, requestId, SwapStatus.DECLINED, userId);
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
	): Promise<SwapRequestWithBook[]> {
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
}