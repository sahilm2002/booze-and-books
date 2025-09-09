import { writable, derived, get } from 'svelte/store';
import { user } from '$lib/stores/auth';
import { BookService } from '$lib/services/bookService';
import { realtimeService } from '../services/realtimeService.js';
import type { Book, BookInput, BookUpdate, BookWithOwner } from '$lib/types/book';
import type { RealtimeChangeEvent } from '../services/realtimeService.js';

export const books = writable<Book[]>([]);
export const booksLoading = writable<boolean>(false);
export const booksError = writable<string | null>(null);
export const bookCount = writable<number>(0);

// Discovery store for available books from other users
export const discoveryBooks = writable<BookWithOwner[]>([]);
export const discoveryBooksLoading = writable<boolean>(false);
export const discoveryBooksError = writable<string | null>(null);

// Derived stores for convenience
export const recentBooks = derived(books, ($books) => {
	return $books.slice(0, 5);
});

export const booksByGenre = derived(books, ($books) => {
	const genreMap = new Map<string, Book[]>();
	
	$books.forEach(book => {
		const genre = book.genre || 'Uncategorized';
		if (!genreMap.has(genre)) {
			genreMap.set(genre, []);
		}
		genreMap.get(genre)!.push(book);
	});
	
	return genreMap;
});

export const booksByCondition = derived(books, ($books) => {
	const conditionMap = new Map<string, Book[]>();
	
	$books.forEach(book => {
		if (!conditionMap.has(book.condition)) {
			conditionMap.set(book.condition, []);
		}
		conditionMap.get(book.condition)!.push(book);
	});
	
	return conditionMap;
});

class BookStore {
	private static instance: BookStore;
	private unsubscribeSwaps?: () => void;
	private unsubscribeBookAvailability?: () => void;
	private currentUserId?: string;

	static getInstance(): BookStore {
		if (!BookStore.instance) {
			BookStore.instance = new BookStore();
		}
		return BookStore.instance;
	}

	async loadUserBooks(userId?: string, skipIfPresent = false) {
		const currentUser = get(user);
		const targetUserId = userId || currentUser?.id;
		
		if (!targetUserId) {
			booksError.set('No user ID provided');
			return;
		}

		// Skip if data already exists and skipIfPresent is true
		if (skipIfPresent && get(books).length > 0) {
			return;
		}

		booksLoading.set(true);
		booksError.set(null);

		try {
			const userBooks = await BookService.getUserBooks(targetUserId);
			books.set(userBooks);
			bookCount.set(userBooks.length);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to load books';
			booksError.set(message);
			books.set([]);
			bookCount.set(0);
		} finally {
			booksLoading.set(false);
		}
	}

	async addBook(bookData: BookInput): Promise<Book | null> {
		const currentUser = get(user);
		
		if (!currentUser?.id) {
			booksError.set('User not authenticated');
			return null;
		}

		booksLoading.set(true);
		booksError.set(null);

		try {
			// Check for duplicate Google Books ID if provided
			if (bookData.google_volume_id) {
				const isDuplicate = await BookService.checkDuplicateGoogleBook(
					currentUser.id,
					bookData.google_volume_id
				);
				if (isDuplicate) {
					throw new Error('You have already added this book to your collection');
				}
			}

			const newBook = await BookService.createBook(currentUser.id, bookData);
			
			// Update local stores
			const currentBooks = get(books);
			books.set([newBook, ...currentBooks]);
			bookCount.set(currentBooks.length + 1);
			
			return newBook;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to add book';
			booksError.set(message);
			return null;
		} finally {
			booksLoading.set(false);
		}
	}

	async updateBook(bookId: string, updates: BookUpdate): Promise<boolean> {
		const currentUser = get(user);
		
		if (!currentUser?.id) {
			booksError.set('User not authenticated');
			return false;
		}

		booksLoading.set(true);
		booksError.set(null);

		try {
			const updatedBook = await BookService.updateBook(bookId, updates, currentUser.id);
			
			// Update local store
			const currentBooks = get(books);
			const updatedBooks = currentBooks.map(book => 
				book.id === bookId ? updatedBook : book
			);
			books.set(updatedBooks);
			
			return true;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to update book';
			booksError.set(message);
			return false;
		} finally {
			booksLoading.set(false);
		}
	}

	async toggleAvailability(bookId: string, isAvailable: boolean): Promise<boolean> {
		const currentUser = get(user);
		
		if (!currentUser?.id) {
			booksError.set('User not authenticated');
			return false;
		}

		booksError.set(null);

		try {
			const updatedBook = await BookService.toggleBookAvailability(
				bookId, 
				isAvailable, 
				currentUser.id
			);
			
			// Update local store
			const currentBooks = get(books);
			const updatedBooks = currentBooks.map(book => 
				book.id === bookId ? updatedBook : book
			);
			books.set(updatedBooks);
			
			return true;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to toggle book availability';
			booksError.set(message);
			return false;
		}
	}

	async deleteBook(bookId: string): Promise<boolean> {
		const currentUser = get(user);
		
		if (!currentUser?.id) {
			booksError.set('User not authenticated');
			return false;
		}

		booksLoading.set(true);
		booksError.set(null);

		try {
			await BookService.deleteBook(bookId, currentUser.id);
			
			// Update local stores
			const currentBooks = get(books);
			const filteredBooks = currentBooks.filter(book => book.id !== bookId);
			books.set(filteredBooks);
			bookCount.set(filteredBooks.length);
			
			return true;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to delete book';
			booksError.set(message);
			return false;
		} finally {
			booksLoading.set(false);
		}
	}

	async loadBookStats(userId?: string) {
		const currentUser = get(user);
		const targetUserId = userId || currentUser?.id;
		
		if (!targetUserId) {
			return;
		}

		try {
			const count = await BookService.getUserBookCount(targetUserId);
			bookCount.set(count);
		} catch (error) {
			console.warn('Failed to load book stats:', error);
		}
	}

	async searchBooks(query: string, userId?: string): Promise<BookWithOwner[]> {
		const currentUser = get(user);
		const targetUserId = userId || currentUser?.id;
		
		if (!targetUserId) {
			throw new Error('No user ID provided');
		}

		try {
			return await BookService.searchBooks(query, targetUserId);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to search books';
			throw new Error(message);
		}
	}

	async getBooksByGenre(genre: string, userId?: string): Promise<BookWithOwner[]> {
		const currentUser = get(user);
		const targetUserId = userId || currentUser?.id;
		
		if (!targetUserId) {
			throw new Error('No user ID provided');
		}

		try {
			return await BookService.getBooksByGenre(genre, targetUserId);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to get books by genre';
			throw new Error(message);
		}
	}

	async getBooksByCondition(condition: string, userId?: string): Promise<BookWithOwner[]> {
		const currentUser = get(user);
		const targetUserId = userId || currentUser?.id;
		
		if (!targetUserId) {
			throw new Error('No user ID provided');
		}

		try {
			return await BookService.getBooksByCondition(condition, targetUserId);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to get books by condition';
			throw new Error(message);
		}
	}

	clearBooks() {
		books.set([]);
		booksError.set(null);
		booksLoading.set(false);
		bookCount.set(0);
	}

	clearError() {
		booksError.set(null);
	}

	hydrate(booksData: Book[], count?: number) {
		books.set(booksData);
		bookCount.set(count ?? booksData.length);
		booksLoading.set(false);
		booksError.set(null);
	}

	// Discovery methods
	async loadDiscoveryBooks(userId?: string): Promise<BookWithOwner[]> {
		const currentUser = get(user);
		// Ensure we extract just the ID string, not the whole user object
		const targetUserId = userId || (typeof currentUser?.id === 'string' ? currentUser.id : null);
		
		if (!targetUserId || typeof targetUserId !== 'string') {
			discoveryBooksError.set('No valid user ID provided');
			return [];
		}

		discoveryBooksLoading.set(true);
		discoveryBooksError.set(null);

		try {
			const availableBooks = await BookService.getAvailableBooksForSwapping(targetUserId);
			discoveryBooks.set(availableBooks);
			this.setupDiscoveryRealtime(targetUserId);
			return availableBooks;
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to load discovery books';
			discoveryBooksError.set(message);
			discoveryBooks.set([]);
			return [];
		} finally {
			discoveryBooksLoading.set(false);
		}
	}

	// Setup real-time subscriptions for discovery books
	private setupDiscoveryRealtime(userId: string) {
		// Clean up existing subscriptions
		this.cleanupDiscoveryRealtime();
		this.currentUserId = userId;

		// Subscribe to swap request changes that might affect book availability
		this.unsubscribeSwaps = realtimeService.subscribeToSwapRequests(
			userId, 
			(event: RealtimeChangeEvent) => {
				// When swap requests change, books might become available/unavailable
				this.handleSwapRequestChange(event);
			}
		);

		// Subscribe to book availability changes
		this.unsubscribeBookAvailability = realtimeService.subscribeToBookAvailability(
			(event: RealtimeChangeEvent<{ id: string; is_available: boolean }>) => {
				this.handleBookAvailabilityChange(event);
			}
		);
	}

	private handleSwapRequestChange(event: RealtimeChangeEvent) {
		// When swap requests change (pending, accepted, completed), 
		// we need to refresh discovery books as books might become available/unavailable
		if (this.currentUserId) {
			// Debounce the refresh to avoid too many calls
			setTimeout(() => {
				this.loadDiscoveryBooks(this.currentUserId);
			}, 1000);
		}
	}

	private handleBookAvailabilityChange(event: RealtimeChangeEvent<{ id: string; is_available: boolean }>) {
		if (!event.new) return;

		// Update the discovery books list based on availability changes
		const currentBooks = get(discoveryBooks);
		const bookId = event.new.id;
		const isAvailable = event.new.is_available;

		if (isAvailable) {
			// If a book becomes available and it's not in our list, we might need to add it
			// But we'd need the full book data, so let's refresh the list
			if (this.currentUserId) {
				this.loadDiscoveryBooks(this.currentUserId);
			}
		} else {
			// If a book becomes unavailable, remove it from discovery
			const filteredBooks = currentBooks.filter(book => book.id !== bookId);
			discoveryBooks.set(filteredBooks);
		}
	}

	private cleanupDiscoveryRealtime() {
		if (this.unsubscribeSwaps) {
			this.unsubscribeSwaps();
			this.unsubscribeSwaps = undefined;
		}
		if (this.unsubscribeBookAvailability) {
			this.unsubscribeBookAvailability();
			this.unsubscribeBookAvailability = undefined;
		}
	}

	// Refresh discovery books manually
	async refreshDiscoveryBooks(): Promise<void> {
		if (this.currentUserId) {
			await this.loadDiscoveryBooks(this.currentUserId);
		}
	}

	clearDiscoveryBooks() {
		discoveryBooks.set([]);
		discoveryBooksError.set(null);
		discoveryBooksLoading.set(false);
		this.cleanupDiscoveryRealtime();
	}

	hydrateDiscoveryBooks(booksData: BookWithOwner[]) {
		discoveryBooks.set(booksData);
		discoveryBooksLoading.set(false);
		discoveryBooksError.set(null);
	}
}

export const bookStore = BookStore.getInstance();

// Auto-load books when user changes (only in browser to avoid SSR issues)
import { browser } from '$app/environment';

if (browser) {
	user.subscribe((currentUser) => {
		if (currentUser) {
			bookStore.loadUserBooks(currentUser.id, true);
			bookStore.loadBookStats(currentUser.id);
		} else {
			bookStore.clearBooks();
			bookStore.clearDiscoveryBooks();
		}
	});
}