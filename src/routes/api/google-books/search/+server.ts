import { json } from '@sveltejs/kit';
import { GoogleBooksService } from '$lib/services/googleBooksService';
import type { RequestHandler } from './$types';
import { GOOGLE_PLACES_API_KEY } from '$env/static/private';
import { env } from '$env/dynamic/private';

/**
 * Normalize "smart" queries like:
 * - isbn:9781234567890 -> 9781234567890
 * - intitle:"Jurassic Park" inauthor:"Michael Crichton" -> Jurassic Park Michael Crichton
 * - inauthor:"Tolkien" -> Tolkien
 * Removes known Google Books operators and quotes so other providers (or plain queries) work.
 */
function normalizeQuery(q: string): string {
	const trimmed = (q || '').trim();
	if (!trimmed) return '';

	// Extract isbn:XXXXXXXXX
	const isbnMatch = trimmed.match(/\bisbn:\s*("?)([0-9xX\-]+)\1/);
	if (isbnMatch && isbnMatch[2]) {
		return isbnMatch[2].replace(/-/g, '');
	}

	// Replace intitle:"..." and inauthor:"..." with their contents
	let out = trimmed
		.replace(/\bintitle:\s*"([^"]+)"/gi, '$1')
		.replace(/\binauthor:\s*"([^"]+)"/gi, '$1')
		.replace(/\bintitle:\s*([^\s]+)/gi, '$1')
		.replace(/\binauthor:\s*([^\s]+)/gi, '$1');

	// Remove any remaining quoted segments (keep content)
	out = out.replace(/"([^"]+)"/g, '$1');

	// Remove remaining known operators (isbn:, intitle:, inauthor:)
	out = out.replace(/\b(isbn|intitle|inauthor):/gi, ' ');

	// Collapse whitespace
	out = out.replace(/\s+/g, ' ').trim();

	return out;
}

export const GET: RequestHandler = async ({ url }) => {
	try {
		const query = url.searchParams.get('q');
		const maxResults = parseInt(url.searchParams.get('maxResults') || '10');
		const startIndex = parseInt(url.searchParams.get('startIndex') || '0');
		const langRestrict = url.searchParams.get('langRestrict') || undefined;

		if (!query || query.trim().length === 0) {
			return json({ error: 'Query parameter is required' }, { status: 400 });
		}

		// Use ONLY a dedicated GOOGLE_BOOKS_API_KEY if explicitly set and non-empty.
		// Do NOT fall back to Places key, since it often has HTTP referrer restrictions not valid for server-side calls.
		const API_KEY =
			env.GOOGLE_BOOKS_API_KEY && env.GOOGLE_BOOKS_API_KEY.trim()
				? env.GOOGLE_BOOKS_API_KEY
				: undefined;

		let response;
		try {
			response = await GoogleBooksService.searchBooks(query.trim(), {
				maxResults: Math.min(maxResults, 40), // Google Books API limit
				startIndex,
				langRestrict,
				apiKey: API_KEY
			});
		} catch (err) {
			// Fallback: retry without API key (some keys are not provisioned for Books API)
			console.warn('Google Books primary search failed, retrying without API key:', err instanceof Error ? err.message : err);
			try {
				response = await GoogleBooksService.searchBooks(query.trim(), {
					maxResults: Math.min(maxResults, 40),
					startIndex,
					langRestrict,
					apiKey: undefined
				});
			} catch (err2) {
				console.warn('Google Books secondary search failed, trying minimal direct fetch:', err2 instanceof Error ? err2.message : err2);
				// Final fallback: minimal direct fetch with only q param, no key, no extras
				const params = new URLSearchParams({
					q: normalizeQuery(query.trim()) || query.trim(),
					maxResults: Math.min(maxResults, 40).toString()
				});
				try {
					const upstream = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`);
					if (upstream.ok) {
						const data = await upstream.json();
						response = {
							items: data.items || [],
							totalItems: data.totalItems || 0
						};
					} else {
						// If even this fails, proceed to graceful empty result
						let body = '';
						try { body = await upstream.text(); } catch {}
						console.error('Google Books minimal fetch failed:', upstream.status, upstream.statusText, body);
						response = { items: [], totalItems: 0 };
					}
				} catch (err3) {
					console.error('Google Books minimal fetch threw error:', err3);
					response = { items: [], totalItems: 0 };
				}
			}
		}

		// If Google returned no items, try a plain-text Google Books search before external fallback
		if (!response || !Array.isArray(response.items) || response.items.length === 0) {
			try {
				const plainQ = normalizeQuery(query.trim());
				if (plainQ && plainQ !== query.trim()) {
					try {
						response = await GoogleBooksService.searchBooks(plainQ, {
							maxResults: Math.min(maxResults, 40),
							startIndex,
							langRestrict,
							apiKey: API_KEY
						});
					} catch {
						response = await GoogleBooksService.searchBooks(plainQ, {
							maxResults: Math.min(maxResults, 40),
							startIndex,
							langRestrict,
							apiKey: undefined
						});
					}
				}
			} catch (e) {
				console.warn('Plain-text Google Books fallback failed:', e);
			}
		}

		// If Google returned no items, try OpenLibrary as a final fallback to avoid empty UX
		if (!response || !Array.isArray(response.items) || response.items.length === 0) {
			try {
				const cleanQ = normalizeQuery(query.trim()) || query.trim();
				const olRes = await fetch(
					`https://openlibrary.org/search.json?q=${encodeURIComponent(cleanQ)}&limit=${Math.min(
						maxResults, 40
					)}`
				);
				if (olRes.ok) {
					const olData = await olRes.json();
					const docs = Array.isArray(olData.docs) ? olData.docs : [];
					const mapped = docs.slice(0, Math.min(maxResults, 40)).map((doc: any) => {
						const idSource =
							doc.key ||
							doc.cover_edition_key ||
							(Array.isArray(doc.edition_key) ? doc.edition_key[0] : null) ||
							(Array.isArray(doc.isbn) ? doc.isbn[0] : null) ||
							doc.title;
						const coverId = doc.cover_i;
						const imageLinks =
							coverId && typeof coverId === 'number'
								? { thumbnail: `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` }
								: undefined;
						const authors = Array.isArray(doc.author_name) ? doc.author_name : [];
						const subjects = Array.isArray(doc.subject) ? doc.subject.slice(0, 3) : [];
						const isbns = Array.isArray(doc.isbn) ? doc.isbn.slice(0, 2) : [];
						const industryIdentifiers = isbns.map((isbn: string) => ({
							type: isbn && isbn.length === 13 ? 'ISBN_13' : 'ISBN_10',
							identifier: isbn
						}));
						return {
							id: `OL:${idSource}`,
							volumeInfo: {
								title: doc.title || 'Unknown Title',
								authors,
								description: null,
								categories: subjects,
								imageLinks,
								industryIdentifiers
							}
						};
					});
					response = { items: mapped, totalItems: mapped.length };
				}
			} catch (olErr) {
				console.warn('OpenLibrary fallback failed:', olErr);
				// keep response as-is (empty)
			}
		}

		return json({
			items: response.items,
			totalItems: response.totalItems,
			query: query.trim()
		});
	} catch (error) {
		// As a final safety net, never 500 the UI; return empty results to avoid breaking add-book flow
		console.error('Google Books search error (graceful fallback to empty):', error);
		return json({
			items: [],
			totalItems: 0,
			query: url.searchParams.get('q')?.trim() || ''
		});
	}
};
