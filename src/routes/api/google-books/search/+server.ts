import { json } from '@sveltejs/kit';
import { GoogleBooksService } from '$lib/services/googleBooksService';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const query = url.searchParams.get('q');
		const maxResults = parseInt(url.searchParams.get('maxResults') || '10');
		const startIndex = parseInt(url.searchParams.get('startIndex') || '0');
		const langRestrict = url.searchParams.get('langRestrict') || undefined;

		if (!query || query.trim().length === 0) {
			return json({ error: 'Query parameter is required' }, { status: 400 });
		}

		const response = await GoogleBooksService.searchBooks(query.trim(), {
			maxResults: Math.min(maxResults, 40), // Google Books API limit
			startIndex,
			langRestrict
		});

		return json({
			items: response.items,
			totalItems: response.totalItems,
			query: query.trim()
		});
	} catch (error) {
		console.error('Google Books search error:', error);
		
		if (error instanceof Error) {
			return json({ 
				error: 'Search failed', 
				message: error.message 
			}, { status: 500 });
		}
		
		return json({ 
			error: 'Search failed', 
			message: 'Unknown error occurred' 
		}, { status: 500 });
	}
};