import type { SupabaseClient } from '@supabase/supabase-js';
import type { Book, BookInput, BookUpdate, BookWithOwner } from '$lib/types/book';

export class BookServiceServer {
	/**
	 * Get all books for a specific user (excluding books with completed swaps)
	 */
	static async getUserBooks(supabase: SupabaseClient, userId: string): Promise<Book[]> {
		const { data, error } = await supabase
			.from('books')
			.select(`
				*,
				swap_requests!book_id (
					id,
					status
				)
			`)
			.eq('owner_id', userId)
			.order('created_at', { ascending: false });

		if (error) {
			throw new Error(`Failed to fetch user books: ${error.message}`);
		}

		// Filter out books that have completed swaps
		const filteredBooks = (data || []).filter(book => {
			const swapRequests = book.swap_requests || [];
			// Exclude books that have any completed swap requests
			return !swapRequests.some((swap: any) => swap.status === 'COMPLETED');
		});

		// Remove the swap_requests field from the response to match Book type
		return filteredBooks.map(book => {
			const { swap_requests, ...bookWithoutSwaps } = book;
			return bookWithoutSwaps;
		});
	}

	/**
	 * Get all books with owner information (for discovery)
	 */
	static async getAllBooksWithOwners(
		supabase: SupabaseClient,
		limit = 50,
		offset = 0
	): Promise<BookWithOwner[]> {
		const { data, error } = await supabase
			.from('books')
			.select(`
				*,
				profiles!owner_id (
					username,
					full_name,
					avatar_url
				)
			`)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			throw new Error(`Failed to fetch books with owners: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Get available books for discovery (excluding current user's books and books with ongoing swaps)
	 */
	static async getAvailableBooksForDiscovery(
		supabase: SupabaseClient,
		currentUserId: string,
		limit = 50,
		offset = 0
	): Promise<BookWithOwner[]> {
		// Handle case where object is passed instead of string
		if (typeof currentUserId !== 'string') {
			console.error('BookServiceServer ERROR - non-string userId detected:', {
				value: currentUserId,
				type: typeof currentUserId
			});
			throw new Error(`BookServiceServer: Expected string userId, got ${typeof currentUserId}: ${JSON.stringify(currentUserId)}`);
		}
		
		const validUserId = (currentUserId || '').trim();
		const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
		if (!UUID_V4_REGEX.test(validUserId)) {
			throw new Error(`Invalid currentUserId format: ${JSON.stringify(currentUserId)}`);
		}
		if (process.env.NODE_ENV === 'development') {
			console.debug('BookServiceServer input currentUserId:', typeof currentUserId, JSON.stringify(currentUserId));
			console.debug('BookServiceServer using validated userId:', validUserId);
		}
		
		// Extra safety check - if we somehow get here with an invalid userId, throw early
		if (typeof validUserId !== 'string' || validUserId.includes('object') || validUserId === '[object Object]') {
			console.error('BookServiceServer ERROR - invalid userId detected:', {
				original: currentUserId,
				validated: validUserId,
				type: typeof currentUserId
			});
			throw new Error(`BookServiceServer: Invalid userId detected - got ${typeof currentUserId}: ${JSON.stringify(currentUserId)}`);
		}

		const { data, error } = await supabase
			.from('books')
			.select(`
				*,
				profiles!owner_id (
					username,
					full_name,
					avatar_url
				),
				swap_requests!book_id (
					id,
					status,
					requester_id
				)
			`)
			.eq('is_available', true)
			.neq('owner_id', validUserId)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			throw new Error(`Failed to fetch available books: ${error.message}`);
		}

		// Filter out books with ongoing swap negotiations or completed swaps
		const filteredBooks = (data || []).filter(book => {
			const swapRequests = book.swap_requests || [];
			
			// Exclude books that have any ongoing swap requests (PENDING, ACCEPTED, COUNTER_OFFER) 
			// or completed swaps
			const hasOngoingOrCompletedSwap = swapRequests.some((swap: any) => 
				swap.status === 'PENDING' || 
				swap.status === 'ACCEPTED' || 
				swap.status === 'COUNTER_OFFER' ||
				swap.status === 'COMPLETED'
			);
			
			return !hasOngoingOrCompletedSwap;
		});

		// Remove the swap_requests field from the response to match BookWithOwner type
		return filteredBooks.map(book => {
			const { swap_requests, ...bookWithoutSwaps } = book;
			return bookWithoutSwaps;
		});
	}

	/**
	 * Toggle book availability for swap requests
	 */
	static async toggleBookAvailability(
		supabase: SupabaseClient,
		bookId: string,
		isAvailable: boolean,
		userId: string
	): Promise<Book> {
		// First check if the book exists and belongs to the user
		const existingBook = await this.getBook(supabase, bookId);
		if (!existingBook) {
			throw new Error('Book not found');
		}
		if (existingBook.owner_id !== userId) {
			throw new Error('You can only update your own books');
		}

		const { data, error } = await supabase
			.from('books')
			.update({ is_available: isAvailable })
			.eq('id', bookId)
			.eq('owner_id', userId)
			.select()
			.single();

		if (error) {
			throw new Error(`Failed to update book availability: ${error.message}`);
		}

		return data;
	}

	/**
	 * Get a single book by ID
	 */
	static async getBook(supabase: SupabaseClient, bookId: string): Promise<Book | null> {
		const { data, error } = await supabase
			.from('books')
			.select('*')
			.eq('id', bookId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null;
			}
			throw new Error(`Failed to fetch book: ${error.message}`);
		}

		return data;
	}

	/**
	 * Get a single book with owner information
	 */
	static async getBookWithOwner(
		supabase: SupabaseClient,
		bookId: string
	): Promise<BookWithOwner | null> {
		const { data, error } = await supabase
			.from('books')
			.select(`
				*,
				profiles!owner_id (
					username,
					full_name,
					avatar_url
				)
			`)
			.eq('id', bookId)
			.single();

		if (error) {
			if (error.code === 'PGRST116') {
				return null;
			}
			throw new Error(`Failed to fetch book with owner: ${error.message}`);
		}

		return data;
	}

	/**
	 * Create a new book
	 */
	static async createBook(
		supabase: SupabaseClient,
		userId: string,
		bookData: BookInput
	): Promise<Book> {
		const bookToInsert = {
			...bookData,
			owner_id: userId
		};

		const { data, error } = await supabase
			.from('books')
			.insert(bookToInsert)
			.select()
			.single();

		if (error) {
			// Handle unique constraint violation for Google Books ID
			if (error.code === '23505' && error.message.includes('unique_user_google_book')) {
				throw new Error('You have already added this book to your collection');
			}
			throw new Error(`Failed to create book: ${error.message}`);
		}

		return data;
	}

	/**
	 * Update a book (only owner can update)
	 */
	static async updateBook(
		supabase: SupabaseClient,
		bookId: string,
		updates: BookUpdate,
		userId: string
	): Promise<Book> {
		// First check if the book exists and belongs to the user
		const existingBook = await this.getBook(supabase, bookId);
		if (!existingBook) {
			throw new Error('Book not found');
		}
		if (existingBook.owner_id !== userId) {
			throw new Error('You can only update your own books');
		}

		const { data, error } = await supabase
			.from('books')
			.update(updates)
			.eq('id', bookId)
			.eq('owner_id', userId)
			.select()
			.single();

		if (error) {
			throw new Error(`Failed to update book: ${error.message}`);
		}

		return data;
	}

	/**
	 * Delete a book (only owner can delete)
	 */
	static async deleteBook(
		supabase: SupabaseClient,
		bookId: string,
		userId: string
	): Promise<void> {
		// First check if the book exists and belongs to the user
		const existingBook = await this.getBook(supabase, bookId);
		if (!existingBook) {
			throw new Error('Book not found');
		}
		if (existingBook.owner_id !== userId) {
			throw new Error('You can only delete your own books');
		}

		const { error } = await supabase
			.from('books')
			.delete()
			.eq('id', bookId)
			.eq('owner_id', userId);

		if (error) {
			throw new Error(`Failed to delete book: ${error.message}`);
		}
	}

	/**
	 * Get book count for a user
	 */
	static async getUserBookCount(supabase: SupabaseClient, userId: string): Promise<number> {
		const { count, error } = await supabase
			.from('books')
			.select('*', { count: 'exact', head: true })
			.eq('owner_id', userId);

		if (error) {
			throw new Error(`Failed to get book count: ${error.message}`);
		}

		return count || 0;
	}

	/**
	 * Get recent books for a user
	 */
	static async getRecentUserBooks(
		supabase: SupabaseClient,
		userId: string,
		limit = 5
	): Promise<Book[]> {
		const { data, error } = await supabase
			.from('books')
			.select('*')
			.eq('owner_id', userId)
			.order('created_at', { ascending: false })
			.limit(limit);

		if (error) {
			throw new Error(`Failed to fetch recent books: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Search books by title, author, or genre
	 */
	static async searchBooks(
		supabase: SupabaseClient,
		query: string,
		userId?: string,
		availableOnly = false,
		limit = 20,
		offset = 0
	): Promise<BookWithOwner[]> {
		let queryBuilder = supabase
			.from('books')
			.select(`
				*,
				profiles!owner_id (
					username,
					full_name,
					avatar_url
				)
			`);

		// If userId is provided, filter by owner
		if (userId) {
			queryBuilder = queryBuilder.eq('owner_id', userId);
		}

		// Filter by availability if requested
		if (availableOnly) {
			queryBuilder = queryBuilder.eq('is_available', true);
		}

		// Add text search
		if (query.trim()) {
			const escapedQuery = query.replace(/[%_]/g, '\\$&');
			queryBuilder = queryBuilder.or(
				`title.ilike.%${escapedQuery}%,genre.ilike.%${escapedQuery}%`
			);
		}

		const { data, error } = await queryBuilder
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			throw new Error(`Failed to search books: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Get books by genre
	 */
	static async getBooksByGenre(
		supabase: SupabaseClient,
		genre: string,
		userId?: string,
		limit = 20,
		offset = 0
	): Promise<BookWithOwner[]> {
		let queryBuilder = supabase
			.from('books')
			.select(`
				*,
				profiles!owner_id (
					username,
					full_name,
					avatar_url
				)
			`)
			.eq('genre', genre);

		// If userId is provided, filter by owner
		if (userId) {
			queryBuilder = queryBuilder.eq('owner_id', userId);
		}

		const { data, error } = await queryBuilder
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			throw new Error(`Failed to fetch books by genre: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Get books by condition
	 */
	static async getBooksByCondition(
		supabase: SupabaseClient,
		condition: string,
		userId?: string,
		limit = 20,
		offset = 0
	): Promise<BookWithOwner[]> {
		let queryBuilder = supabase
			.from('books')
			.select(`
				*,
				profiles!owner_id (
					username,
					full_name,
					avatar_url
				)
			`)
			.eq('condition', condition);

		// If userId is provided, filter by owner
		if (userId) {
			queryBuilder = queryBuilder.eq('owner_id', userId);
		}

		const { data, error } = await queryBuilder
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			throw new Error(`Failed to fetch books by condition: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Check if user already has a book with the same Google Books ID
	 */
	static async checkDuplicateGoogleBook(
		supabase: SupabaseClient,
		userId: string,
		googleVolumeId: string
	): Promise<boolean> {
		if (!googleVolumeId) return false;

		const { data, error } = await supabase
			.from('books')
			.select('id')
			.eq('owner_id', userId)
			.eq('google_volume_id', googleVolumeId)
			.single();

		if (error && error.code !== 'PGRST116') {
			throw new Error(`Failed to check duplicate book: ${error.message}`);
		}

		return !!data;
	}

	/**
	 * Get book statistics for dashboard
	 */
	static async getBookStats(supabase: SupabaseClient, userId: string) {
		const [bookCount, recentBooks] = await Promise.all([
			this.getUserBookCount(supabase, userId),
			this.getRecentUserBooks(supabase, userId, 3)
		]);

		return {
			bookCount,
			recentBooks
		};
	}
}
