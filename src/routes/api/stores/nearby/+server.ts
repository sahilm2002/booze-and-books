import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { GooglePlacesService } from '$lib/services/googlePlacesService';
import { cache, CacheKeys } from '$lib/services/cacheService';
import type { USStore, SupportedStoreChain } from '$lib/types/cocktail';
import { calculateDistance } from '$lib/types/cocktail';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { zipCode, radiusMiles = 10 } = await request.json();

		if (!zipCode) {
			return json({ error: 'Zip code is required' }, { status: 400 });
		}

		// Check cache first
		const cacheKey = CacheKeys.stores(zipCode, radiusMiles);
		const cached = cache.get(cacheKey);
		if (cached && Array.isArray(cached) && cached.length > 0) {
			return json({ success: true, data: cached });
		}

		// Get coordinates from zip code
		let userCoords = await GooglePlacesService.withRetry(
			() => GooglePlacesService.rateLimitedApiCall(
				() => GooglePlacesService.geocodeZipCode(zipCode)
			)
		);

		// Fallback coordinates for development or when geocoding fails
		if (!userCoords) {
			userCoords = getFallbackCoordsForZip(zipCode);
		}

		if (!userCoords) {
			return json({ error: 'Invalid zip code or location not found' }, { status: 400 });
		}

		// Find nearby stores
		const stores = await findStoresUsingGooglePlaces(userCoords, radiusMiles);

		// Fallback to OpenStreetMap Overpass if Google returns no results
		if (stores.length === 0) {
			try {
				const osm = await findStoresUsingOpenStreetMap(userCoords, radiusMiles);
				if (Array.isArray(osm) && osm.length > 0) {
					stores.push(...osm);
				}
			} catch (e) {
				console.warn('OSM fallback failed:', e);
			}
		}

		// Final fallback: OpenStreetMap Nominatim text search near lat/lon for common queries
		if (stores.length === 0) {
			try {
				const nom = await findStoresUsingNominatim(userCoords, radiusMiles);
				if (Array.isArray(nom) && nom.length > 0) {
					stores.push(...nom);
				}
			} catch (e) {
				console.warn('Nominatim fallback failed:', e);
			}
		}

		// Sort by distance (return up to 12; UI controls how many to show)
		let nearbyStores = stores
			.sort((a, b) => (a.distance || 0) - (b.distance || 0))
			.slice(0, 12);


		// Cache for 30 minutes (only cache non-empty results)
		if (nearbyStores.length > 0) {
			cache.set(cacheKey, nearbyStores, 1800);
		}

		return json({ success: true, data: nearbyStores });

	} catch (error) {
		console.error('Store locator API error:', error);
		return json({ error: 'Failed to find nearby stores' }, { status: 500 });
	}
};

// Fallback coordinates by ZIP prefix (development-friendly)
function getFallbackCoordsForZip(zipCode: string): { latitude: number; longitude: number } | null {
	try {
		const match = zipCode.match(/^\d{5}/);
		if (!match) return null;
		const firstDigit = match[0][0];
		switch (firstDigit) {
			case '0': // New England
				return { latitude: 42.3601, longitude: -71.0589 }; // Boston
			case '1': // NY
				return { latitude: 40.7128, longitude: -74.0060 }; // NYC
			case '2': // Mid-Atlantic
				return { latitude: 38.9072, longitude: -77.0369 }; // Washington, DC
			case '3': // Southeast
				return { latitude: 33.7490, longitude: -84.3880 }; // Atlanta
			case '4': // Great Lakes
				return { latitude: 42.3314, longitude: -83.0458 }; // Detroit
			case '5': // Upper Midwest
				return { latitude: 44.9778, longitude: -93.2650 }; // Minneapolis
			case '6': // Midwest/Plains
				return { latitude: 41.8781, longitude: -87.6298 }; // Chicago
			case '7': // South Central
				return { latitude: 32.7767, longitude: -96.7970 }; // Dallas
			case '8': // Mountain West
				return { latitude: 39.7392, longitude: -104.9903 }; // Denver
			case '9': // West Coast
				return { latitude: 37.7749, longitude: -122.4194 }; // San Francisco
			default:
				return null;
		}
	} catch {
		return null;
	}
}

async function findStoresUsingGooglePlaces(
	userCoords: {latitude: number, longitude: number},
	radiusMiles: number
): Promise<USStore[]> {
	const stores: USStore[] = [];
	const radiusMeters = radiusMiles * 1609.34; // Convert miles to meters

	// Store chains that sell alcohol and cocktail ingredients
	const SUPPORTED_CHAINS = [
		'Target',
		'Walmart', 
		'Kroger',
		'Total Wine & More',
		'BevMo!',
		'Safeway',
		'CVS Pharmacy',
		'Walgreens',
		'Costco',
		'Sam\'s Club',
		'Whole Foods Market',
		'Trader Joe\'s',
		'Publix',
		'H-E-B',
		'Meijer'
	];

	// Search for each supported chain with progressive widening
	const seenIds = new Set<string>();
	const chainRadii = Array.from(new Set([radiusMiles, 15, 25]));
	for (const miles of chainRadii) {
		const meters = miles * 1609.34;
		for (const chain of SUPPORTED_CHAINS) {
			try {
				const chainStores = await searchPlacesForChain(userCoords, meters, chain);
				for (const s of chainStores) {
					if (!seenIds.has(s.id)) {
						seenIds.add(s.id);
						stores.push(s);
					}
				}
			} catch (error) {
				console.warn(`Failed to search for ${chain} at ${miles} miles:`, error);
				// Continue with other chains even if one fails
			}
		}
		if (stores.length > 0) break;
	}

	// Fallback: if chain search finds nothing, try category/keyword search and progressive widening
	if (stores.length === 0) {
		const types = ['liquor_store', 'supermarket', 'grocery_or_supermarket', 'drugstore'];
		const keywords = ['liquor', 'spirits', 'wine', 'beer', 'safeway', 'target', 'total wine', 'bevmo', 'walgreens', 'cvs', 'whole foods', 'trader joe'];
		// Try the requested radius, then widen to 15 and 25 miles
		const radiiMiles = Array.from(new Set([radiusMiles, 15, 25]));
		for (const miles of radiiMiles) {
			const meters = miles * 1609.34;
			try {
				const rawPlaces = await GooglePlacesService.withRetry(
					() => GooglePlacesService.rateLimitedApiCall(
						() => GooglePlacesService.findNearbyByTypesAndKeywords(
							userCoords.latitude,
							userCoords.longitude,
							meters,
							types,
							keywords
						)
					)
				);

				// Deduplicate by place_id
				const seen = new Set<string>();
				const places = [];
				for (const p of rawPlaces) {
					if (p.place_id && !seen.has(p.place_id)) {
						seen.add(p.place_id);
						places.push(p);
					}
				}

				// Fetch details and convert
				for (const place of places.slice(0, 12)) {
					try {
						const details = await GooglePlacesService.withRetry(
							() => GooglePlacesService.rateLimitedApiCall(
								() => GooglePlacesService.getPlaceDetails(place.place_id)
							)
						);
						if (details) {
							const store = await convertGooglePlaceToStore(place, details, userCoords);
							if (store) {
								if (!seenIds.has(store.id)) {
									seenIds.add(store.id);
									stores.push(store);
								}
							} else {
								// Fallback to minimal conversion
								const minimal = convertNearbyPlaceToMinimalStore(place, userCoords);
								if (minimal && !seenIds.has(minimal.id)) {
									seenIds.add(minimal.id);
									stores.push(minimal);
								}
							}
						} else {
							// Fallback to minimal conversion
							const minimal = convertNearbyPlaceToMinimalStore(place, userCoords);
							if (minimal && !seenIds.has(minimal.id)) {
								seenIds.add(minimal.id);
								stores.push(minimal);
							}
						}
					} catch (detailErr) {
						console.warn('Failed to get details for fallback place', place.place_id, detailErr);
					}
				}

				if (stores.length > 0) break;
			} catch (fallbackErr) {
				console.warn(`Fallback search failed at ${miles} miles:`, fallbackErr);
			}
		}

		// Final fallback: Google Text Search queries with progressive widening
		if (stores.length === 0) {
			const queries = ['Safeway', 'Target', 'liquor store', 'Total Wine', 'BevMo', 'Walgreens', 'CVS', 'Whole Foods', "Trader Joe's"];
			for (const miles of radiiMiles) {
				const meters = miles * 1609.34;
				try {
					for (const q of queries) {
						const raw = await GooglePlacesService.withRetry(
							() => GooglePlacesService.rateLimitedApiCall(
								() => GooglePlacesService.findByTextSearch(
									userCoords.latitude,
									userCoords.longitude,
									meters,
									q
								)
							)
						);

						// Deduplicate by place_id
						const seen = new Set<string>();
						const places = [];
						for (const p of raw) {
							if (p.place_id && !seen.has(p.place_id)) {
								seen.add(p.place_id);
								places.push(p);
							}
						}

						for (const place of places.slice(0, 12)) {
							try {
								const details = await GooglePlacesService.withRetry(
									() => GooglePlacesService.rateLimitedApiCall(
										() => GooglePlacesService.getPlaceDetails(place.place_id)
									)
								);
								if (details) {
									const store = await convertGooglePlaceToStore(place, details, userCoords);
									if (store && !seenIds.has(store.id)) {
										seenIds.add(store.id);
										stores.push(store);
									} else {
										// Fallback to minimal conversion
										const minimal = convertNearbyPlaceToMinimalStore(place, userCoords);
										if (minimal && !seenIds.has(minimal.id)) {
											seenIds.add(minimal.id);
											stores.push(minimal);
										}
									}
								} else {
									// Fallback to minimal conversion
									const minimal = convertNearbyPlaceToMinimalStore(place, userCoords);
									if (minimal && !seenIds.has(minimal.id)) {
										seenIds.add(minimal.id);
										stores.push(minimal);
									}
								}
							} catch (detailErr) {
								console.warn('Failed to get details for text search place', place.place_id, detailErr);
							}
						}

						if (stores.length > 0) break;
					}
					if (stores.length > 0) break;
				} catch (textErr) {
					console.warn(`Text search failed at ${miles} miles:`, textErr);
				}
			}
		}
	}

	return stores;
}

async function searchPlacesForChain(
	userCoords: {latitude: number, longitude: number},
	radiusMeters: number,
	chainName: string
): Promise<USStore[]> {
	// Check cache first
	const cacheKey = CacheKeys.nearbyStores(userCoords.latitude, userCoords.longitude, radiusMeters, chainName);
	const cached = cache.get(cacheKey);
	if (cached && Array.isArray(cached) && cached.length > 0) {
		return cached;
	}

	try {
		// Use real Google Places API
		const places = await GooglePlacesService.withRetry(
			() => GooglePlacesService.rateLimitedApiCall(
				() => GooglePlacesService.findNearbyStores(
					userCoords.latitude,
					userCoords.longitude,
					radiusMeters,
					chainName
				)
			)
		);

		// If Places returns no results, do not synthesize stores
		if (!places || places.length === 0) {
			return [];
		}

		const stores: USStore[] = [];

		for (const place of places.slice(0, 2)) { // Limit to 2 per chain
			try {
				// Get detailed information
				const details = await GooglePlacesService.withRetry(
					() => GooglePlacesService.rateLimitedApiCall(
						() => GooglePlacesService.getPlaceDetails(place.place_id)
					)
				);
				
				if (details) {
					const store = await convertGooglePlaceToStore(place, details, userCoords);
					if (store) {
						stores.push(store);
					} else {
						// Fallback to minimal conversion using Nearby result if details conversion failed
						const minimal = convertNearbyPlaceToMinimalStore(place, userCoords);
						if (minimal) stores.push(minimal);
					}
				} else {
					// Fallback to minimal conversion when details not available
					const minimal = convertNearbyPlaceToMinimalStore(place, userCoords);
					if (minimal) stores.push(minimal);
				}
			} catch (detailError) {
				console.warn(`Failed to get details for place ${place.place_id}:`, detailError);
				// Continue with other places
			}
		}

		// If no stores found after details, return empty (no synthesized data)
		if (stores.length === 0) {
			return [];
		}

		// Cache for 30 minutes
		cache.set(cacheKey, stores, 1800);
		return stores;

	} catch (error) {
		console.error(`Error searching for ${chainName}:`, error);
		// Do not synthesize stores on error; return empty
		return [];
	}
}

async function convertGooglePlaceToStore(
	place: any,
	details: any,
	userCoords: {latitude: number, longitude: number}
): Promise<USStore | null> {
	try {
		const location = details.geometry?.location;
		if (!location) return null;

		const distance = calculateDistance(
			userCoords.latitude,
			userCoords.longitude,
			location.lat,
			location.lng
		);

		// Parse address components
		const addressParts = details.formatted_address?.split(', ') || [];
		const zipMatch = details.formatted_address?.match(/\b\d{5}(-\d{4})?\b/);
		const stateMatch = details.formatted_address?.match(/\b[A-Z]{2}\b/);
		const types = details.types || place.types || [];

		const store: USStore = {
			id: place.place_id,
			name: details.name || place.name,
			chain: detectChainFromName(details.name || place.name),
			address: addressParts[0] || details.formatted_address,
			city: addressParts[addressParts.length - 3] || 'Unknown',
			state: stateMatch?.[0] || 'CA',
			zipCode: zipMatch?.[0] || '00000',
			latitude: location.lat,
			longitude: location.lng,
			phone: details.formatted_phone_number,
			websiteUrl: details.website,
			supportsAlcohol: chainSupportsAlcohol(details.name) || types.includes('liquor_store') || types.includes('supermarket') || types.includes('grocery_or_supermarket'),
			supportsDelivery: chainSupportsDelivery(details.name),
			supportsPickup: true,
			apiIntegration: false,
			cartBaseUrl: undefined,
			hours: convertGoogleHours(details.opening_hours),
			distance: Math.round(distance * 10) / 10
		};

		return store;
	} catch (error) {
		console.error('Error converting Google Place to store:', error);
		return null;
	}
}

/**
 * Minimal conversion using only Nearby/Search result (no details).
 * Ensures we still return valid stores if Place Details is unavailable.
 */
function convertNearbyPlaceToMinimalStore(
	place: any,
	userCoords: { latitude: number; longitude: number }
): USStore | null {
	try {
		const loc = place.geometry?.location;
		if (!loc) return null;

		const distance = calculateDistance(
			userCoords.latitude,
			userCoords.longitude,
			loc.lat,
			loc.lng
		);

		const name: string = place.name || 'Unknown Store';
		const vicinity: string = place.vicinity || place.formatted_address || 'Unknown address';

		const store: USStore = {
			id: place.place_id,
			name,
			chain: detectChainFromName(name),
			address: vicinity,
			city: 'Unknown',
			state: 'CA',
			zipCode: '00000',
			latitude: loc.lat,
			longitude: loc.lng,
			phone: undefined,
			websiteUrl: '',
			supportsAlcohol: (Array.isArray(place.types) && (place.types.includes('liquor_store') || place.types.includes('supermarket') || place.types.includes('grocery_or_supermarket'))) ? true : chainSupportsAlcohol(name),
			supportsDelivery: chainSupportsDelivery(name),
			supportsPickup: true,
			apiIntegration: false,
			cartBaseUrl: undefined,
			hours: undefined,
			distance: Math.round(distance * 10) / 10
		};

		return store;
	} catch (e) {
		console.warn('Minimal store conversion failed:', e);
		return null;
	}
}

/**
 * Final fallback: OpenStreetMap Overpass API (no keys, public data).
 * Returns minimal store info when Google yields zero results due to quota/restrictions.
 */
async function findStoresUsingOpenStreetMap(
	userCoords: { latitude: number; longitude: number },
	radiusMiles: number
): Promise<USStore[]> {
	try {
		const radiusMeters = Math.round(radiusMiles * 1609.34);
		const q = `[out:json][timeout:25];
(
  node["shop"~"supermarket|alcohol|convenience"](around:${radiusMeters},${userCoords.latitude},${userCoords.longitude});
  node["amenity"~"pharmacy|marketplace"](around:${radiusMeters},${userCoords.latitude},${userCoords.longitude});
);
out center;`;
		const body = new URLSearchParams({ data: q }).toString();
		const resp = await fetch('https://overpass-api.de/api/interpreter', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body
		});
		if (!resp.ok) {
			console.warn('Overpass API returned non-OK:', resp.status, resp.statusText);
			return [];
		}
		const data = await resp.json();
		const elements = Array.isArray(data?.elements) ? data.elements : [];
		const seen = new Set<string>();
		const stores: USStore[] = [];
		for (const el of elements.slice(0, 50)) {
			const s = convertOsmElementToStore(el, userCoords);
			if (s && !seen.has(s.id)) {
				seen.add(s.id);
				stores.push(s);
			}
		}
		return stores;
	} catch (e) {
		console.warn('Overpass fallback error:', e);
		return [];
	}
}

function convertOsmElementToStore(
	el: any,
	userCoords: { latitude: number; longitude: number }
): USStore | null {
	try {
		const lat = typeof el.lat === 'number' ? el.lat : el.center?.lat;
		const lon = typeof el.lon === 'number' ? el.lon : el.center?.lon;
		if (typeof lat !== 'number' || typeof lon !== 'number') return null;

		const tags = el.tags || {};
		const name: string = tags.name || 'Unknown Store';

		const addressLine = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
		const locality = [tags['addr:city'], tags['addr:state'], tags['addr:postcode']].filter(Boolean).join(', ');
		const address = addressLine || tags['addr:full'] || locality || 'Address unavailable';

		const distance = calculateDistance(
			userCoords.latitude,
			userCoords.longitude,
			lat,
			lon
		);

		const shop = tags.shop || '';
		const supportsAlcohol =
			shop === 'alcohol' ||
			/liquor|wine|bevmo|total wine/i.test(name) ||
			chainSupportsAlcohol(name);

		const store: USStore = {
			id: `osm-${el.type}-${el.id}`,
			name,
			chain: detectChainFromName(name),
			address,
			city: tags['addr:city'] || 'Unknown',
			state: tags['addr:state'] || 'CA',
			zipCode: tags['addr:postcode'] || '00000',
			latitude: lat,
			longitude: lon,
			phone: undefined,
			websiteUrl: tags.website || '',
			supportsAlcohol,
			supportsDelivery: false,
			supportsPickup: true,
			apiIntegration: false,
			cartBaseUrl: undefined,
			hours: undefined,
			distance: Math.round(distance * 10) / 10
		};

		return store;
	} catch (e) {
		console.warn('Failed to convert OSM element:', e);
		return null;
	}
}

/**
 * Nominatim fallback: text search for common store queries near the user's coordinates
 */
async function findStoresUsingNominatim(
	userCoords: { latitude: number; longitude: number },
	radiusMiles: number
): Promise<USStore[]> {
	// Try multiple queries; stop when we accumulate some results
	const queries = [
		'liquor store',
		'supermarket',
		'grocery store',
		'Walgreens',
		'CVS',
		'Target',
		'Safeway',
		'Total Wine',
		'BevMo'
	];

	const results: USStore[] = [];
	const seen = new Set<string>();

	// Nominatim usage policy requires a descriptive UA via 'User-Agent' and referer if possible.
	// fetch in Node may not set UA, but we still attempt simple calls respectfully.
	for (const q of queries) {
		try {
			// Bias around coordinates by appending "near <lat>,<lon>"
			const url = new URL('https://nominatim.openstreetmap.org/search');
			url.searchParams.set('format', 'json');
			url.searchParams.set('addressdetails', '1');
			url.searchParams.set('limit', '15');
			url.searchParams.set('q', `${q} near ${userCoords.latitude}, ${userCoords.longitude}`);

			const resp = await fetch(url.toString(), {
				headers: {
					'Accept': 'application/json'
				}
			});
			if (!resp.ok) {
				console.warn('Nominatim non-OK:', resp.status, resp.statusText);
				continue;
			}
			const data = await resp.json();
			if (!Array.isArray(data)) continue;

			for (const item of data) {
				const s = convertNominatimToStore(item, userCoords);
				if (s && !seen.has(s.id)) {
					seen.add(s.id);
					results.push(s);
				}
			}

			if (results.length > 0) break;
		} catch (e) {
			console.warn('Nominatim query failed for', q, e);
		}
	}

	return results;
}

function convertNominatimToStore(
	item: any,
	userCoords: { latitude: number; longitude: number }
): USStore | null {
	try {
		const lat = parseFloat(item.lat);
		const lon = parseFloat(item.lon);
		if (!isFinite(lat) || !isFinite(lon)) return null;

		const addr = item.address || {};
		const line = item.display_name || '';
		const name: string = item.name || addr.shop || addr.supermarket || 'Unknown Store';

		const distance = calculateDistance(
			userCoords.latitude,
			userCoords.longitude,
			lat,
			lon
		);

		// Heuristic for alcohol support: look at class/type and name keywords
		const cls = item.class || '';
		const typ = item.type || '';
		const supportsAlcohol =
			/^(alcohol|beverages)$/.test(typ) ||
			/liquor|wine|bevmo|total wine/i.test(name) ||
			chainSupportsAlcohol(name);

		const store: USStore = {
			id: `nominatim-${item.place_id}`,
			name,
			chain: detectChainFromName(name),
			address: line,
			city: addr.city || addr.town || addr.village || 'Unknown',
			state: addr.state || 'CA',
			zipCode: addr.postcode || '00000',
			latitude: lat,
			longitude: lon,
			phone: undefined,
			websiteUrl: '',
			supportsAlcohol,
			supportsDelivery: false,
			supportsPickup: true,
			apiIntegration: false,
			cartBaseUrl: undefined,
			hours: undefined,
			distance: Math.round(distance * 10) / 10
		};

		return store;
	} catch (e) {
		console.warn('Failed to convert Nominatim item:', e);
		return null;
	}
}

function detectChainFromName(name: string): SupportedStoreChain {
	const nameLower = (name || '').toLowerCase();
	
	if (nameLower.includes('target')) return 'target';
	if (nameLower.includes('walmart')) return 'walmart';
	if (nameLower.includes('kroger')) return 'kroger';
	if (nameLower.includes('total wine')) return 'total_wine';
	if (nameLower.includes('bevmo')) return 'bevmo';
	if (nameLower.includes('safeway')) return 'safeway';
	if (nameLower.includes('publix')) return 'publix';
	if (nameLower.includes('h-e-b') || nameLower.includes('heb')) return 'heb';
	if (nameLower.includes('meijer')) return 'meijer';
	if (nameLower.includes('costco')) return 'costco';
	if (nameLower.includes('sam\'s club') || nameLower.includes('sams club') || nameLower.includes('sam s club')) return 'sams_club';
	if (nameLower.includes('whole foods')) return 'whole_foods';
	if (nameLower.includes('trader joe')) return 'trader_joes';
	if (nameLower.includes('cvs')) return 'cvs';
	if (nameLower.includes('walgreens')) return 'walgreens';
	
	// Default fallback
	return 'target';
}

function convertGoogleHours(openingHours: any): Record<string, string> | undefined {
	if (!openingHours?.weekday_text) return undefined;

	const hours: Record<string, string> = {};
	const dayMap: Record<string, string> = {
		'Monday': 'monday',
		'Tuesday': 'tuesday', 
		'Wednesday': 'wednesday',
		'Thursday': 'thursday',
		'Friday': 'friday',
		'Saturday': 'saturday',
		'Sunday': 'sunday'
	};

	openingHours.weekday_text.forEach((dayText: string) => {
		const [day, time] = dayText.split(': ');
		const dayKey = dayMap[day];
		if (dayKey) {
			hours[dayKey] = time || 'Closed';
		}
	});

	return hours;
}

function getChainWebsite(chainName: string): string {
	const websites: Record<string, string> = {
		'Target': 'https://www.target.com',
		'Walmart': 'https://www.walmart.com',
		'Kroger': 'https://www.kroger.com',
		'Total Wine & More': 'https://www.totalwine.com',
		'BevMo!': 'https://www.bevmo.com',
		'Safeway': 'https://www.safeway.com',
		'CVS Pharmacy': 'https://www.cvs.com',
		'Walgreens': 'https://www.walgreens.com',
		'Costco': 'https://www.costco.com',
		'Sam\'s Club': 'https://www.samsclub.com',
		'Whole Foods Market': 'https://www.wholefoodsmarket.com',
		'Trader Joe\'s': 'https://www.traderjoes.com'
	};
	return websites[chainName] || '';
}

function chainSupportsAlcohol(name: string): boolean {
	// Normalize arbitrary place/name to a known chain slug, then check capability
	const slug = detectChainFromName(name);
	const allowed: SupportedStoreChain[] = [
		'target',
		'walmart',
		'kroger',
		'total_wine',
		'bevmo',
		'safeway',
		'publix',
		'heb',
		'meijer'
	];
	return allowed.includes(slug);
}

function chainSupportsDelivery(name: string): boolean {
	// Normalize arbitrary place/name to a known chain slug, then check capability
	const slug = detectChainFromName(name);
	const allowed: SupportedStoreChain[] = [
		'target',
		'walmart',
		'kroger',
		'total_wine',
		'safeway',
		'publix',
		'heb',
		'meijer'
	];
	return allowed.includes(slug);
}
