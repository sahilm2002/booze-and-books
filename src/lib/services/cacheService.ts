// Simple in-memory cache for development and production
class SimpleCache {
	private cache = new Map<string, { data: any; expires: number }>();

	set(key: string, data: any, ttlSeconds: number = 3600): void {
		this.cache.set(key, {
			data,
			expires: Date.now() + (ttlSeconds * 1000)
		});
	}

	get(key: string): any | null {
		const item = this.cache.get(key);
		if (!item) return null;
		
		if (Date.now() > item.expires) {
			this.cache.delete(key);
			return null;
		}
		
		return item.data;
	}

	clear(): void {
		this.cache.clear();
	}

	// Get cache statistics for monitoring
	getStats(): { size: number; keys: string[] } {
		return {
			size: this.cache.size,
			keys: Array.from(this.cache.keys())
		};
	}

	// Clean up expired entries
	cleanup(): void {
		const now = Date.now();
		for (const [key, item] of this.cache.entries()) {
			if (now > item.expires) {
				this.cache.delete(key);
			}
		}
	}
}

export const cache = new SimpleCache();

// Clean up expired cache entries every 10 minutes
if (typeof window === 'undefined') { // Only run on server
	setInterval(() => {
		cache.cleanup();
	}, 10 * 60 * 1000);
}

// Cache key generators for consistent naming
export const CacheKeys = {
	stores: (zipCode: string, radiusMiles: number) => `stores_${zipCode}_${radiusMiles}`,
	geocode: (zipCode: string) => `geocode_${zipCode}`,
	placeDetails: (placeId: string) => `place_${placeId}`,
	nearbyStores: (lat: number, lng: number, radius: number, chain: string) => 
		`nearby_${lat.toFixed(4)}_${lng.toFixed(4)}_${radius}_${chain}`
};
