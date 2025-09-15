import { supabase } from '$lib/supabase';
import type { Book, BookInput, BookUpdate, BookWithOwner } from '$lib/types/book';
import { withValidSession } from '$lib/utils/apiWrapper';

export class BookService {
	/**
	 * Get all books for a specific user
	 */
	static async getUserBooks(userId: string): Promise<Book[]> {
		const { data, error } = await supabase
			.from('books')
			.select('*')
			.eq('owner_id', userId)
			.order('created_at', { ascending: false });

		if (error) {
			throw new Error(`Failed to fetch user books: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Get all books with owner information (for discovery)
	 */
	static async getAllBooksWithOwners(limit = 50, offset = 0): Promise<BookWithOwner[]> {
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
	 * Get available books for discovery (excluding current user's books)
	 */
	static async getAvailableBooksForDiscovery(
		currentUserId: string,
		limit = 50,
		offset = 0
	): Promise<BookWithOwner[]> {
        // Validate userId
        const validUserId = (currentUserId || '').trim();
        const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!UUID_V4_REGEX.test(validUserId)) {
          throw new Error(`Invalid currentUserId format: ${JSON.stringify(currentUserId)}`);
        }

        if (import.meta.env.DEV) {
            console.debug('BookService: validated userId for discovery');
        }
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
			.eq('is_available', true)
			.neq('owner_id', validUserId)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			throw new Error(`Failed to fetch available books: ${error.message}`);
		}

		return data || [];
	}

	/**
	 * Toggle book availability for swap requests
	 */
	static async toggleBookAvailability(
		bookId: string,
		isAvailable: boolean,
		userId: string
	): Promise<Book> {
		// First check if the book exists and belongs to the user
		const existingBook = await this.getBook(bookId);
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
	static async getBook(bookId: string): Promise<Book | null> {
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
	static async getBookWithOwner(bookId: string): Promise<BookWithOwner | null> {
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
	static async createBook(userId: string, bookData: BookInput): Promise<Book> {
		return withValidSession(async () => {
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
		});
	}

	/**
	 * Update a book (only owner can update)
	 */
	static async updateBook(bookId: string, updates: BookUpdate, userId: string): Promise<Book> {
		return withValidSession(async () => {
			// First check if the book exists and belongs to the user
			const existingBook = await this.getBook(bookId);
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
		});
	}

	/**
	 * Delete a book (only owner can delete)
	 */
	static async deleteBook(bookId: string, userId: string): Promise<void> {
		return withValidSession(async () => {
			// First check if the book exists and belongs to the user
			const existingBook = await this.getBook(bookId);
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
		});
	}

	/**
	 * Get book count for a user
	 */
	static async getUserBookCount(userId: string): Promise<number> {
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
	static async getRecentUserBooks(userId: string, limit = 5): Promise<Book[]> {
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
		userId: string,
		googleVolumeId: string
	): Promise<boolean> {
		// Return false if no googleVolumeId provided (can't check duplicates)
		if (!googleVolumeId || googleVolumeId.trim() === '') {
			return false;
		}

		try {
			const { data, error } = await supabase
				.from('books')
				.select('id')
				.eq('owner_id', userId)
				.eq('google_volume_id', googleVolumeId.trim())
				.maybeSingle(); // Use maybeSingle instead of single to avoid errors when no match

			if (error) {
				console.error('Error checking duplicate book:', error);
				// Don't throw error, just return false to allow book creation
				return false;
			}

			return !!data;
		} catch (error) {
			console.error('Exception checking duplicate book:', error);
			// Don't throw error, just return false to allow book creation
			return false;
		}
	}

	/**
	 * Alias for getAvailableBooksForDiscovery (for backward compatibility)
	 */
	static async getAvailableBooksForSwapping(
		currentUserId: string,
		limit = 50,
		offset = 0
	): Promise<BookWithOwner[]> {
		return this.getAvailableBooksForDiscovery(currentUserId, limit, offset);
	}
}
