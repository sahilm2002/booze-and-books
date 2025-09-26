import { supabase } from '$lib/supabase';
import type { 
	USStore, 
	StoreLocatorRequest, 
	StoreLocatorApiResponse,
	ShoppingCartRequest,
	ShoppingCartItem,
	SupportedStoreChain
} from '$lib/types/cocktail';
import { calculateDistance, SUPPORTED_STORE_CHAINS } from '$lib/types/cocktail';

export class StoreLocatorService {
	/**
	 * Find nearby stores based on user's zip code using server-side API
	 */
	static async findNearbyStores(request: StoreLocatorRequest): Promise<USStore[]> {
		try {
			const response = await fetch('/api/stores/nearby', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					zipCode: request.zipCode,
					radiusMiles: request.radiusMiles || 10
				})
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error || 'Failed to find nearby stores');
			}

			return result.data || [];

		} catch (error) {
			console.error('Failed to find nearby stores:', error);
			throw new Error('Failed to find nearby stores. Please try again.');
		}
	}

	/**
	 * Get store details by ID
	 */
	static async getStoreById(storeId: string): Promise<USStore | null> {
		const { data, error } = await supabase
			.from('us_stores')
			.select('*')
			.eq('id', storeId)
			.single();

		if (error || !data) {
			return null;
		}

		return this.mapDatabaseToStore(data);
	}

	/**
	 * Get all supported store chains
	 */
	static async getSupportedChains(): Promise<string[]> {
		const { data, error } = await supabase
			.from('us_stores')
			.select('chain')
			.eq('supports_alcohol', true);

		if (error) {
			return [];
		}

		// Return unique chains
		const chains = [...new Set(data.map(store => store.chain))];
		return chains.sort();
	}

	/**
	 * Build shopping cart URL for a store with cocktail ingredients
	 */
	static buildShoppingCartUrl(store: USStore, items: ShoppingCartItem[]): string {
		// This would integrate with store APIs when available
		// For now, return the store's website with a search query
		
		const baseUrl = store.websiteUrl;
		const ingredientNames = items.map(item => item.ingredientName).join(' ');
		
		// Build search URLs for different store chains
		switch (store.chain) {
			case 'target':
				return `${baseUrl}/s?searchTerm=${encodeURIComponent(ingredientNames)}`;
			
			case 'walmart':
				return `${baseUrl}/search?query=${encodeURIComponent(ingredientNames)}`;
			
			case 'kroger':
				return `${baseUrl}/search?query=${encodeURIComponent(ingredientNames)}`;
			
			case 'bevmo':
				return `${baseUrl}/search?text=${encodeURIComponent(ingredientNames)}`;
			
			case 'total_wine':
				return `${baseUrl}/search/all?text=${encodeURIComponent(ingredientNames)}`;
			
			default:
				return baseUrl;
		}
	}

	/**
	 * Get estimated total price for cocktail ingredients
	 */
	static async getEstimatedPrice(ingredientNames: string[]): Promise<number> {
		const { data, error } = await supabase
			.from('cocktail_ingredients')
			.select('name, average_price_usd')
			.in('name', ingredientNames);

		if (error || !data) {
			return 0;
		}

		return data.reduce((total, ingredient) => {
			return total + (ingredient.average_price_usd || 0);
		}, 0);
	}

	/**
	 * Get ingredient substitutes for unavailable items
	 */
	static async getIngredientSubstitutes(ingredientName: string): Promise<string[]> {
		const { data, error } = await supabase
			.from('cocktail_ingredients')
			.select('substitutes')
			.eq('name', ingredientName)
			.single();

		if (error || !data || !data.substitutes) {
			return [];
		}

		return Array.isArray(data.substitutes) ? data.substitutes : [];
	}

	/**
	 * Track store selection for analytics
	 */
	static async trackStoreSelection(
		userId: string,
		storeId: string,
		cocktailId: string
	): Promise<void> {
		// This could be used for analytics to see which stores are most popular
		// For now, we'll just log it
		console.log('Store selected:', { userId, storeId, cocktailId });
	}

	// Private helper methods

	private static mapDatabaseToStore(dbStore: any): USStore {
		return {
			id: dbStore.id,
			name: dbStore.name,
			chain: dbStore.chain,
			address: dbStore.address,
			city: dbStore.city,
			state: dbStore.state,
			zipCode: dbStore.zip_code,
			latitude: dbStore.latitude,
			longitude: dbStore.longitude,
			phone: dbStore.phone,
			websiteUrl: dbStore.website_url,
			supportsAlcohol: dbStore.supports_alcohol,
			supportsDelivery: dbStore.supports_delivery,
			supportsPickup: dbStore.supports_pickup,
			apiIntegration: dbStore.api_integration,
			cartBaseUrl: dbStore.cart_base_url,
			hours: dbStore.hours
		};
	}

	/**
	 * Validate US zip code format
	 */
	static validateZipCode(zipCode: string): boolean {
		const zipRegex = /^\d{5}(-\d{4})?$/;
		return zipRegex.test(zipCode);
	}

	/**
	 * Format store address for display
	 */
	static formatStoreAddress(store: USStore): string {
		return `${store.address}, ${store.city}, ${store.state} ${store.zipCode}`;
	}

	/**
	 * Get store hours for today
	 */
	static getTodayHours(store: USStore): string | null {
		if (!store.hours) return null;

		const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase(); // 'mon', 'tue', etc.
		const dayMap: Record<string, keyof typeof store.hours> = {
			'sun': 'sunday',
			'mon': 'monday',
			'tue': 'tuesday',
			'wed': 'wednesday',
			'thu': 'thursday',
			'fri': 'friday',
			'sat': 'saturday'
		};

		const dayKey = dayMap[today];
		return dayKey && store.hours[dayKey] ? store.hours[dayKey] : null;
	}

	/**
	 * Check if store is currently open
	 */
	static isStoreOpen(store: USStore): boolean {
		const todayHours = this.getTodayHours(store);
		if (!todayHours || todayHours.toLowerCase() === 'closed') {
			return false;
		}

		// Parse hours like "9:00 AM - 10:00 PM"
		const hoursMatch = todayHours.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
		if (!hoursMatch) return false;

		const now = new Date();
		const currentHour = now.getHours();
		const currentMinute = now.getMinutes();

		// Convert opening time to 24-hour format
		let openHour = parseInt(hoursMatch[1]);
		const openMinute = parseInt(hoursMatch[2]);
		const openPeriod = hoursMatch[3].toUpperCase();
		
		if (openPeriod === 'PM' && openHour !== 12) openHour += 12;
		if (openPeriod === 'AM' && openHour === 12) openHour = 0;

		// Convert closing time to 24-hour format
		let closeHour = parseInt(hoursMatch[4]);
		const closeMinute = parseInt(hoursMatch[5]);
		const closePeriod = hoursMatch[6].toUpperCase();
		
		if (closePeriod === 'PM' && closeHour !== 12) closeHour += 12;
		if (closePeriod === 'AM' && closeHour === 12) closeHour = 0;

		// Check if current time is within store hours
		const currentTotalMinutes = currentHour * 60 + currentMinute;
		const openTotalMinutes = openHour * 60 + openMinute;
		const closeTotalMinutes = closeHour * 60 + closeMinute;

		return currentTotalMinutes >= openTotalMinutes && currentTotalMinutes <= closeTotalMinutes;
	}
}
