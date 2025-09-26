import { Client } from '@googlemaps/google-maps-services-js';
import { GOOGLE_PLACES_API_KEY, GOOGLE_GEOCODING_API_KEY } from '$env/static/private';

const client = new Client({});

export class GooglePlacesService {
	/**
	 * Convert zip code to coordinates using Google Geocoding API
	 */
	static async geocodeZipCode(zipCode: string): Promise<{latitude: number, longitude: number} | null> {
		try {
			const response = await client.geocode({
				params: {
					address: zipCode,
					key: GOOGLE_GEOCODING_API_KEY,
				},
			});

			if (response.data.results.length > 0) {
				const location = response.data.results[0].geometry.location;
				return {
					latitude: location.lat,
					longitude: location.lng
				};
			}

			return null;
		} catch (error) {
			console.error('Geocoding error:', error);
			return null;
		}
	}

	/**
	 * Search for stores near coordinates using Google Places API
	 */
	static async findNearbyStores(
		latitude: number,
		longitude: number,
		radiusMeters: number,
		storeChain: string
	): Promise<any[]> {
		try {
			const response = await client.placesNearby({
				params: {
					location: { lat: latitude, lng: longitude },
					radius: radiusMeters,
					keyword: storeChain,
					type: 'store',
					key: GOOGLE_PLACES_API_KEY,
				},
			});

			return response.data.results || [];
		} catch (error) {
			console.error(`Places API error for ${storeChain}:`, error);
			return [];
		}
	}

	/**
	 * Get detailed place information
	 */
	static async getPlaceDetails(placeId: string): Promise<any | null> {
		try {
			const response = await client.placeDetails({
				params: {
					place_id: placeId,
					fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'opening_hours', 'geometry'],
					key: GOOGLE_PLACES_API_KEY,
				},
			});

			return response.data.result || null;
		} catch (error) {
			console.error('Place details error:', error);
			return null;
		}
	}

	/**
	 * Rate limiting helper to prevent API quota exhaustion
	 */
	private static lastApiCall = 0;
	private static readonly MIN_API_INTERVAL = 100; // 100ms between calls

	static async rateLimitedApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
		const now = Date.now();
		const timeSinceLastCall = now - this.lastApiCall;
		
		if (timeSinceLastCall < this.MIN_API_INTERVAL) {
			await new Promise(resolve => 
				setTimeout(resolve, this.MIN_API_INTERVAL - timeSinceLastCall)
			);
		}
		
		this.lastApiCall = Date.now();
		return apiCall();
	}

	/**
	 * Retry logic for API calls
	 */
	static async withRetry<T>(
		operation: () => Promise<T>,
		maxRetries: number = 3,
		delay: number = 1000
	): Promise<T> {
		for (let i = 0; i < maxRetries; i++) {
			try {
				return await operation();
			} catch (error) {
				if (i === maxRetries - 1) throw error;
				await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
			}
		}
		throw new Error('Max retries exceeded');
	}
}
