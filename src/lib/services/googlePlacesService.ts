import { Client } from '@googlemaps/google-maps-services-js';
import { GOOGLE_PLACES_API_KEY, GOOGLE_GEOCODING_API_KEY } from '$env/static/private';

const client = new Client({});

export class GooglePlacesService {
  /**
   * Convert zip code to coordinates using Google Geocoding API
   */
  static async geocodeZipCode(zipCode: string): Promise<{ latitude: number; longitude: number } | null> {
    const trimmed = (zipCode ?? '').toString().trim();
    const ZIP_RE = /^\d{5}(-\d{4})?$/;
    if (!trimmed || !ZIP_RE.test(trimmed)) {
      console.warn('[GooglePlacesService] geocodeZipCode: invalid ZIP input, skipping call');
      return null;
    }
    try {
      // Primary: Google Geocoding API
      const response = await this.rateLimitedApiCall(() =>
        this.withRetry(() =>
          client.geocode({
            params: {
              address: trimmed,
              key: GOOGLE_GEOCODING_API_KEY
            }
          })
        )
      );

      if (response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        return {
          latitude: location.lat,
          longitude: location.lng
        };
      }

      // Fallback: Google Places Text Search (in case geocoding key is missing or restricted)
      const textResp = await this.rateLimitedApiCall(() =>
        this.withRetry(() =>
          client.textSearch({
            params: {
              query: `${trimmed} USA`,
              key: GOOGLE_PLACES_API_KEY
            }
          })
        )
      );
      if (textResp.data.results?.length > 0) {
        const loc = textResp.data.results[0]?.geometry?.location;
        if (loc) {
          return { latitude: loc.lat, longitude: loc.lng };
        }
      }

      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      // Last-chance fallback via Places Text Search
      try {
        const textResp = await this.rateLimitedApiCall(() =>
          this.withRetry(() =>
            client.textSearch({
              params: {
                query: `${trimmed} USA`,
                key: GOOGLE_PLACES_API_KEY
              }
            })
          )
        );
        if (textResp.data.results?.length > 0) {
          const loc = textResp.data.results[0]?.geometry?.location;
          if (loc) {
            return { latitude: loc.lat, longitude: loc.lng };
          }
        }
      } catch (err2) {
        console.warn('Places text search fallback failed:', err2);
      }
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
      // First pass: use radius with keyword (no type restriction to avoid filtering out supermarkets/department stores)
      let response = await this.rateLimitedApiCall(() =>
        this.withRetry(() =>
          client.placesNearby({
            params: {
              location: { lat: latitude, lng: longitude },
              radius: radiusMeters,
              keyword: storeChain,
              key: GOOGLE_PLACES_API_KEY
            }
          })
        )
      );

      let results = response.data.results || [];

      // Second pass: if empty, try rankby=distance (omit radius) to broaden search semantics
      if (!results.length) {
        const resp2 = await this.rateLimitedApiCall(() =>
          this.withRetry(() =>
            client.placesNearby({
              params: {
                location: { lat: latitude, lng: longitude },
                rankby: 'distance' as any,
                keyword: storeChain,
                key: GOOGLE_PLACES_API_KEY
              }
            })
          )
        );
        results = resp2.data.results || [];
      }

      return results;
    } catch (error) {
      console.error(`Places API error for ${storeChain}:`, error);
      return [];
    }
  }

  /**
   * Text Search fallback (query-based). Returns raw Places results.
   */
  static async findByTextSearch(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    query: string
  ): Promise<any[]> {
    try {
      const resp = await this.rateLimitedApiCall(() =>
        this.withRetry(() =>
          client.textSearch({
            params: {
              query,
              location: { lat: latitude, lng: longitude },
              radius: radiusMeters,
              key: GOOGLE_PLACES_API_KEY
            }
          })
        )
      );
      return resp.data.results || [];
    } catch (err) {
      console.warn(`Places text search failed for "${query}":`, err);
      return [];
    }
  }

  /**
   * Generic nearby search by types and keywords (for liquor/supermarket fallbacks)
   * Returns raw Places results (deduped by place_id)
   */
  static async findNearbyByTypesAndKeywords(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    types: string[],
    keywords: string[]
  ): Promise<any[]> {
    const seen = new Set<string>();
    const results: any[] = [];

    // Query by types
    for (const t of types) {
      try {
        // First pass: radius + type
        let resp = await this.rateLimitedApiCall(() =>
          this.withRetry(() =>
            client.placesNearby({
              params: {
                location: { lat: latitude, lng: longitude },
                radius: radiusMeters,
                type: t as any,
                key: GOOGLE_PLACES_API_KEY
              }
            })
          )
        );
        let res = resp.data.results || [];

        // Second pass: rankby=distance + type (omit radius)
        if (!res.length) {
          const resp2 = await this.rateLimitedApiCall(() =>
            this.withRetry(() =>
              client.placesNearby({
                params: {
                  location: { lat: latitude, lng: longitude },
                  rankby: 'distance' as any,
                  type: t as any,
                  key: GOOGLE_PLACES_API_KEY
                }
              })
            )
          );
          res = resp2.data.results || [];
        }

        for (const place of res) {
          if (place.place_id && !seen.has(place.place_id)) {
            seen.add(place.place_id);
            results.push(place);
          }
        }
      } catch (err) {
        console.warn(`Places type search failed for ${t}:`, err);
      }
    }

    // Query by keywords
    for (const kw of keywords) {
      try {
        // First pass: radius + keyword
        let resp = await this.rateLimitedApiCall(() =>
          this.withRetry(() =>
            client.placesNearby({
              params: {
                location: { lat: latitude, lng: longitude },
                radius: radiusMeters,
                keyword: kw,
                key: GOOGLE_PLACES_API_KEY
              }
            })
          )
        );
        let res = resp.data.results || [];

        // Second pass: rankby=distance + keyword (omit radius)
        if (!res.length) {
          const resp2 = await this.rateLimitedApiCall(() =>
            this.withRetry(() =>
              client.placesNearby({
                params: {
                  location: { lat: latitude, lng: longitude },
                  rankby: 'distance' as any,
                  keyword: kw,
                  key: GOOGLE_PLACES_API_KEY
                }
              })
            )
          );
          res = resp2.data.results || [];
        }

        for (const place of res) {
          if (place.place_id && !seen.has(place.place_id)) {
            seen.add(place.place_id);
            results.push(place);
          }
        }
      } catch (err) {
        console.warn(`Places keyword search failed for ${kw}:`, err);
      }
    }

    return results;
  }

  /**
   * Get detailed place information
   */
  static async getPlaceDetails(placeId: string): Promise<any | null> {
    try {
      const response = await this.rateLimitedApiCall(() =>
        this.withRetry(() =>
          client.placeDetails({
            params: {
              place_id: placeId,
              fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'opening_hours', 'geometry'],
              key: GOOGLE_PLACES_API_KEY
            }
          })
        )
      );

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
      await new Promise((resolve) => setTimeout(resolve, this.MIN_API_INTERVAL - timeSinceLastCall));
    }

    this.lastApiCall = Date.now();
    return apiCall();
  }

  /**
   * Retry logic for API calls
   */
  static async withRetry<T>(operation: () => Promise<T>, maxRetries: number = 3, delay: number = 1000): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
    throw new Error('Max retries exceeded');
  }
}
