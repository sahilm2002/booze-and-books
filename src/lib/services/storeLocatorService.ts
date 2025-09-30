import { supabase } from '$lib/supabase';
import type {
  USStore,
  StoreLocatorRequest,
  ShoppingCartItem
} from '$lib/types/cocktail';

/**
 * Store locator client service
 * - Calls our server endpoint to discover nearby stores
 * - Formats store info for UI (address, hours, open/closed)
 * - Builds shopping URLs for chains, adding ZIP context when supported
 */
export class StoreLocatorService {
  /**
   * Find nearby stores based on user's zip code using server-side API
   * Client also progressively widens the radius to improve hit rate.
   */
  static async findNearbyStores(request: StoreLocatorRequest): Promise<USStore[]> {
    try {
      const uniqueRadii = Array.from(
        new Set<number>([request.radiusMiles || 10, 15, 25, 35])
      );

      const seen = new Set<string>();
      let all: USStore[] = [];

      for (const miles of uniqueRadii) {
        const response = await fetch('/api/stores/nearby', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            zipCode: request.zipCode,
            radiusMiles: miles
          })
        });

        // Parse JSON even on non-OK to surface server error message
        const raw = await response.text();
        let result: any = {};
        try {
          result = raw ? JSON.parse(raw) : {};
        } catch {
          result = {};
        }

        if (!response.ok) {
          const msg =
            result?.error || `Failed to find nearby stores (HTTP ${response.status})`;
          throw new Error(msg);
        }
        if (!result.success) {
          throw new Error(result.error || 'Failed to find nearby stores');
        }

        const batch: USStore[] = Array.isArray(result.data) ? result.data : [];
        for (const s of batch) {
          if (s && s.id && !seen.has(s.id)) {
            seen.add(s.id);
            all.push(s);
          }
        }

        if (all.length > 0) break; // found some at this radius
      }

      // Apply includeAlcoholOnly preference with graceful fallback to all
      if (request.includeAlcoholOnly) {
        const alcoholStores = all.filter((s) => s.supportsAlcohol);
        if (alcoholStores.length > 0) {
          return alcoholStores;
        }
      }

      return all;
    } catch (error) {
      console.error('Failed to find nearby stores:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to find nearby stores. Please try again.');
    }
  }

  /**
   * Get store details by ID (from DB, if applicable)
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
   * Get all supported store chains (alcohol-enabled) from DB
   */
  static async getSupportedChains(): Promise<string[]> {
    const { data, error } = await supabase
      .from('us_stores')
      .select('chain')
      .eq('supports_alcohol', true);

    if (error) {
      return [];
    }

    const chains = [...new Set((data || []).map((store: any) => store.chain))];
    return chains.sort();
  }

  /**
   * Build shopping/cart entry URL for a store, adding ZIP context where supported.
   */
  static buildShoppingCartUrl(
    store: USStore,
    _items: ShoppingCartItem[],
    userZipCode?: string
  ): string {
    // Fallback to known chain websites when API did not provide a website URL
    const defaultWebsites: Record<string, string> = {
      target: 'https://www.target.com',
      walmart: 'https://www.walmart.com',
      kroger: 'https://www.kroger.com',
      bevmo: 'https://www.bevmo.com',
      total_wine: 'https://www.totalwine.com',
      safeway: 'https://www.safeway.com',
      publix: 'https://www.publix.com',
      heb: 'https://www.heb.com',
      meijer: 'https://www.meijer.com',
      costco: 'https://www.costco.com',
      sams_club: 'https://www.samsclub.com',
      whole_foods: 'https://www.wholefoodsmarket.com',
      trader_joes: 'https://www.traderjoes.com',
      cvs: 'https://www.cvs.com',
      walgreens: 'https://www.walgreens.com'
    };

    const baseUrl =
      (store.websiteUrl && store.websiteUrl.startsWith('http')
        ? store.websiteUrl
        : defaultWebsites[store.chain]) || '';

    if (!baseUrl) return '';

    const zip = userZipCode?.trim();
    const q = zip ? encodeURIComponent(zip) : '';

    switch (store.chain) {
      case 'target':
        // Example: https://www.target.com/store-locator/find-stores/10103
        return zip ? `${baseUrl}/store-locator/find-stores/${q}` : baseUrl;

      case 'walmart':
        // Example: https://www.walmart.com/store/finder?location=10103
        return zip ? `${baseUrl}/store/finder?location=${q}` : baseUrl;

      case 'kroger':
        // Example: https://www.kroger.com/stores/search?searchText=10103
        return zip ? `${baseUrl}/stores/search?searchText=${q}` : baseUrl;

      case 'bevmo':
        // No stable ZIP param; send to homepage
        return baseUrl;

      case 'total_wine':
        // Example: https://www.totalwine.com/store-finder (no direct ZIP param supported reliably)
        return baseUrl;

      case 'safeway':
        // Example: https://www.safeway.com/shop/store-locator.html?q=10103
        return zip ? `${baseUrl}/shop/store-locator.html?q=${q}` : baseUrl;

      case 'publix':
        // Example: https://www.publix.com/stores?search=10103
        return zip ? `${baseUrl}/stores?search=${q}` : baseUrl;

      case 'heb':
        // Example: https://www.heb.com/store-locations?zip=10103
        return zip ? `${baseUrl}/store-locations?zip=${q}` : baseUrl;

      case 'meijer':
        // Example: https://www.meijer.com/shopping/store-locator.html (no stable ZIP param)
        return baseUrl;

      case 'costco':
        // Example: https://www.costco.com/warehouse-locations?loc=10103
        return zip ? `${baseUrl}/warehouse-locations?loc=${q}` : baseUrl;

      case 'sams_club':
        // Example: https://www.samsclub.com/club-finder?location=10103
        return zip ? `${baseUrl}/club-finder?location=${q}` : baseUrl;

      case 'whole_foods':
        // Example: https://www.wholefoodsmarket.com/stores?zip=10103
        return zip ? `${baseUrl}/stores?zip=${q}` : baseUrl;

      case 'trader_joes':
        // Example: https://www.traderjoes.com/home?search=10103 (approx)
        return zip ? `${baseUrl}/home?search=${q}` : baseUrl;

      case 'cvs':
        // Example: https://www.cvs.com/store-locator/ (ZIP entered on site)
        return baseUrl;

      case 'walgreens':
        // Example: https://www.walgreens.com/storelist/results.jsp?requestType=locator&zip=10103
        return zip ? `${baseUrl}/storelist/results.jsp?requestType=locator&zip=${q}` : baseUrl;

      default:
        return baseUrl;
    }
  }

  /**
   * Get estimated total price for cocktail ingredients (from DB baseline averages)
   */
  static async getEstimatedPrice(ingredientNames: string[]): Promise<number> {
    const { data, error } = await supabase
      .from('cocktail_ingredients')
      .select('name, average_price_usd')
      .in('name', ingredientNames);

    if (error || !data) {
      return 0;
    }

    return data.reduce((total: number, ingredient: any) => {
      return total + (ingredient.average_price_usd || 0);
    }, 0);
  }

  /**
   * Get ingredient substitutes for unavailable items (from DB)
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
   * Track store selection for analytics (no-op for now)
   */
  static async trackStoreSelection(
    userId: string,
    storeId: string,
    cocktailId: string
  ): Promise<void> {
    console.log('Store selected:', { userId, storeId, cocktailId });
  }

  // =======================
  // Utility helpers
  // =======================

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
      hours: dbStore.hours,
      distance: undefined
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
   * Get store hours for today (raw string)
   */
  static getTodayHours(store: USStore): string | null {
    if (!store.hours) return null;

    const todayShort = new Date()
      .toLocaleDateString('en-US', { weekday: 'short' })
      .toLowerCase(); // 'sun','mon',...
    const dayMap: Record<string, keyof NonNullable<USStore['hours']>> = {
      sun: 'sunday',
      mon: 'monday',
      tue: 'tuesday',
      wed: 'wednesday',
      thu: 'thursday',
      fri: 'friday',
      sat: 'saturday'
    };

    const key = dayMap[todayShort];
    const val = key ? (store.hours as any)[key] : undefined;
    return val || null;
  }

  /**
   * Determine if a store is currently open
   * Handles common formats:
   * - "9 AM - 10 PM"
   * - "9:00 AM - 10:00 PM"
   * - "9AM-10PM"
   * - multiple ranges separated by comma
   * - "Open 24 hours"
   * - en/em dashes
   * - simple overnight handling (e.g., 8 PM - 2 AM)
   */
  static isStoreOpen(store: USStore): boolean {
    const todayRaw = this.getTodayHours(store);
    if (!todayRaw) return false;

    const normalized = todayRaw
      .replace(/[–—]/g, '-') // normalize en/em dash
      .replace(/\u202F|\u00A0/g, ' ') // non-breaking spaces to normal
      .trim();

    // Handle 24h phrasing
    if (/24\s*hours/i.test(normalized) || /open\s*24/i.test(normalized)) {
      return true;
    }

    // Some providers return multiple ranges separated by comma
    const ranges = normalized.split(',').map((r) => r.trim()).filter(Boolean);

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Parse a single range like "9 AM - 10 PM" or "9:00 AM - 10:00 PM" or "9AM-10PM"
    const parseRange = (range: string): [number, number] | null => {
      // Allow optional minutes and variable spacing
      const re =
        /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i;
      const m = range.match(re);
      if (!m) return null;

      let openHour = parseInt(m[1], 10);
      const openMin = m[2] ? parseInt(m[2], 10) : 0;
      let closeHour = parseInt(m[4], 10);
      const closeMin = m[5] ? parseInt(m[5], 10) : 0;

      const openPeriod = m[3].toUpperCase();
      const closePeriod = m[6].toUpperCase();

      if (openPeriod === 'PM' && openHour !== 12) openHour += 12;
      if (openPeriod === 'AM' && openHour === 12) openHour = 0;

      if (closePeriod === 'PM' && closeHour !== 12) closeHour += 12;
      if (closePeriod === 'AM' && closeHour === 12) closeHour = 0;

      const openTotal = openHour * 60 + openMin;
      const closeTotal = closeHour * 60 + closeMin;

      return [openTotal, closeTotal];
    };

    for (const r of ranges) {
      const parsed = parseRange(r);
      if (!parsed) continue;
      const [openTotal, closeTotal] = parsed;

      // Handle overnight hours (e.g., 8 PM - 2 AM)
      if (closeTotal < openTotal) {
        if (currentMinutes >= openTotal || currentMinutes <= closeTotal) {
          return true;
        }
      } else {
        if (currentMinutes >= openTotal && currentMinutes <= closeTotal) {
          return true;
        }
      }
    }

    return false;
  }
}
