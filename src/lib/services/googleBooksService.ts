import type { GoogleBookResult } from '../types/book.js';

const GOOGLE_BOOKS_API_BASE = 'https://www.googleapis.com/books/v1/volumes';

export interface GoogleBooksSearchOptions {
	maxResults?: number;
	startIndex?: number;
	langRestrict?: string;
	// Server-side only: pass API key from the API route to avoid bundling private env on client
	apiKey?: string;
}

export class GoogleBooksService {
	/**
	 * Escape special characters in Google Books query strings
	 * Escapes: " \ + - : ! ( ) [ ] { } ^ ~ * ? /
	 */
	private static escapeQueryString(input: string): string {
		if (!input || typeof input !== 'string') {
			return '';
		}
		
		// Trim whitespace and escape special Google Books query characters
		return input.trim().replace(/[\\"+\-:!()[\]{}^~*?/]/g, '\\$&');
	}

	/**
	 * Search for books using the Google Books API
	 * Supports searching by title, author, or ISBN
	 */
	static async searchBooks(
		query: string,
		options: GoogleBooksSearchOptions = {}
	): Promise<{ items: GoogleBookResult[]; totalItems: number }> {
		if (!query.trim()) {
			return { items: [], totalItems: 0 };
		}

		const { maxResults = 10, startIndex = 0, langRestrict, apiKey } = options;
		
		const searchParams = new URLSearchParams({
			q: query.trim(),
			maxResults: Math.min(maxResults, 40).toString(), // Google Books API limit is 40
			startIndex: startIndex.toString(),
			projection: 'lite',
			printType: 'books'
		});

		if (langRestrict) {
			searchParams.append('langRestrict', langRestrict);
		}
		if (apiKey) {
			searchParams.append('key', apiKey);
		}

		try {
			const response = await fetch(`${GOOGLE_BOOKS_API_BASE}?${searchParams}`);
			
			if (!response.ok) {
				// Try to surface upstream error body for easier debugging
				let body = '';
				try {
					body = await response.text();
				} catch {}
				throw new Error(`Google Books API error: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`);
			}

			const data = await response.json();
			
			return {
				items: data.items || [],
				totalItems: data.totalItems || 0
			};
		} catch (error) {
			console.error('Google Books API search error:', error);
			throw new Error('Failed to search books. Please try again.');
		}
	}

	/**
	 * Search books by title with enhanced query formatting
	 */
	static async searchByTitle(title: string, options?: GoogleBooksSearchOptions) {
		const escapedTitle = this.escapeQueryString(title);
		if (!escapedTitle) {
			return { items: [], totalItems: 0 };
		}
		const formattedQuery = `intitle:"${escapedTitle}"`;
		return this.searchBooks(formattedQuery, options);
	}

	/**
	 * Search books by author with enhanced query formatting
	 */
	static async searchByAuthor(author: string, options?: GoogleBooksSearchOptions) {
		const escapedAuthor = this.escapeQueryString(author);
		if (!escapedAuthor) {
			return { items: [], totalItems: 0 };
		}
		const formattedQuery = `inauthor:"${escapedAuthor}"`;
		return this.searchBooks(formattedQuery, options);
	}

	/**
	 * Search books by ISBN
	 */
	static async searchByIsbn(isbn: string, options?: GoogleBooksSearchOptions) {
		const cleanIsbn = isbn.replace(/[\s-]/g, '');
		const formattedQuery = `isbn:${cleanIsbn}`;
		return this.searchBooks(formattedQuery, options);
	}

	/**
	 * Get a specific book by its Google Books ID
	 */
	static async getBookById(volumeId: string): Promise<GoogleBookResult | null> {
		if (!volumeId.trim()) {
			return null;
		}

		try {
			const response = await fetch(`${GOOGLE_BOOKS_API_BASE}/${volumeId}`);
			
			if (!response.ok) {
				if (response.status === 404) {
					return null;
				}
				throw new Error(`Google Books API error: ${response.status} ${response.statusText}`);
			}

			return await response.json();
		} catch (error) {
			console.error('Google Books API get book error:', error);
			return null;
		}
	}

	/**
	 * Extract book data from Google Books API result for our application
	 */
	static extractBookData(googleBook: GoogleBookResult) {
		const { volumeInfo } = googleBook;
		
		// Extract ISBN (prefer ISBN-13, fallback to ISBN-10)
		const isbn = volumeInfo.industryIdentifiers?.find(
			id => id.type === 'ISBN_13'
		)?.identifier || volumeInfo.industryIdentifiers?.find(
			id => id.type === 'ISBN_10'
		)?.identifier || null;

		// Get the best available thumbnail
		const thumbnailUrl = volumeInfo.imageLinks?.thumbnail || 
						   volumeInfo.imageLinks?.smallThumbnail || null;

		// Get primary genre from categories
		const genre = volumeInfo.categories?.[0] || null;

		return {
			title: volumeInfo.title || 'Unknown Title',
			authors: volumeInfo.authors || ['Unknown Author'],
			isbn,
			description: volumeInfo.description || null,
			google_volume_id: googleBook.id,
			genre
		};
	}

	/**
	 * Format search results for display in autocomplete/dropdown
	 */
	static formatSearchResults(results: GoogleBookResult[]) {
		return results.map(book => {
			const extracted = this.extractBookData(book);
			const thumbnailUrl = book.volumeInfo.imageLinks?.thumbnail || 
							   book.volumeInfo.imageLinks?.smallThumbnail || null;
			
			return {
				...extracted,
				thumbnail_url: thumbnailUrl,
				displayText: `${extracted.title} by ${extracted.authors.join(', ')}`,
				googleBookId: book.id
			};
		});
	}

	/**
	 * Build smart search query from user input
	 * Attempts to detect if input is ISBN, author, or title
	 */
	static buildSmartQuery(input: string): string {
		const trimmed = input.trim();
		
		if (!trimmed) {
			return '';
		}
		
		// Check if it looks like an ISBN (digits, spaces, hyphens)
		if (/^[\d\s-]{10,17}$/.test(trimmed)) {
			const cleanIsbn = trimmed.replace(/[\s-]/g, '');
			return `isbn:${cleanIsbn}`;
		}

		// Check if it looks like "Title by Author"
		if (trimmed.includes(' by ')) {
			const parts = trimmed.split(' by ');
			if (parts.length === 2) {
				const escapedTitle = this.escapeQueryString(parts[0]);
				const escapedAuthor = this.escapeQueryString(parts[1]);
				if (escapedTitle && escapedAuthor) {
					return `intitle:"${escapedTitle}" inauthor:"${escapedAuthor}"`;
				}
			}
		}

		// Check if it looks like "Author - Title"
		if (trimmed.includes(' - ')) {
			const parts = trimmed.split(' - ');
			if (parts.length === 2) {
				const escapedAuthor = this.escapeQueryString(parts[0]);
				const escapedTitle = this.escapeQueryString(parts[1]);
				if (escapedAuthor && escapedTitle) {
					return `inauthor:"${escapedAuthor}" intitle:"${escapedTitle}"`;
				}
			}
		}

		// Default to general search
		return trimmed;
	}
}
