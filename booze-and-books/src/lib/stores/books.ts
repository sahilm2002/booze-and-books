import { writable, derived, get } from 'svelte/store';
import { user } from '$lib/stores/auth';
import { BookService } from '$lib/services/bookService';
import type { Book, BookInput, BookUpdate, BookWithOwner } from '$lib/types/book';

export const books = writable<Book[]>([]);
export const booksLoading = writable<boolean>(false);
export const booksError = writable<string | null>(null);
export const bookCount = writable<number>(0);

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
}

export const bookStore = BookStore.getInstance();

// Auto-load books when user changes
user.subscribe((currentUser) => {
	if (currentUser) {
		bookStore.loadUserBooks(currentUser.id, true);
		bookStore.loadBookStats(currentUser.id);
	} else {
		bookStore.clearBooks();
	}
});