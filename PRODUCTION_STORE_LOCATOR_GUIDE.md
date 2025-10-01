# Production Store Locator Implementation Guide

This guide walks you through making the store locator production-ready with real Google Places API integration.

## 🎯 Overview

Currently, the store locator uses simulated data. To make it production-ready, you need to:
1. Set up Google Cloud Platform APIs
2. Add environment variables
3. Replace simulated methods with real API calls
4. Add error handling and caching
5. Implement rate limiting

## 📋 Step-by-Step Implementation

### Step 1: Set Up Google Cloud Platform

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Note your project ID

2. **Enable Required APIs**
   ```bash
   # Enable Places API
   gcloud services enable places-backend.googleapis.com
   
   # Enable Geocoding API (for zip code to coordinates)
   gcloud services enable geocoding-backend.googleapis.com
   
   # Enable Maps JavaScript API (if you want map display)
   gcloud services enable maps-backend.googleapis.com
   ```

3. **Create API Key**
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "API Key"
   - Copy the API key
   - **Important**: Restrict the API key to your domain for security

4. **Set API Key Restrictions**
   - Click on your API key to edit
   - Under "Application restrictions", select "HTTP referrers"
   - Add your domains: `yourdomain.com/*`, `localhost:*` (for development)
   - Under "API restrictions", select "Restrict key" and choose:
     - Places API
     - Geocoding API
     - Maps JavaScript API (optional)

### Step 2: Add Environment Variables

Add to your `.env` file:
```env
# Google Maps/Places API
GOOGLE_PLACES_API_KEY=your_api_key_here
GOOGLE_GEOCODING_API_KEY=your_api_key_here  # Can be same as Places API key

# Optional: Enable caching
REDIS_URL=your_redis_url_for_caching  # For production caching
```

Add to your `.env.example`:
```env
# Google Maps/Places API Keys
GOOGLE_PLACES_API_KEY=your_google_places_api_key
GOOGLE_GEOCODING_API_KEY=your_google_geocoding_api_key
```

### Step 3: Install Required Dependencies

```bash
npm install @googlemaps/google-maps-services-js
# or
npm install node-fetch  # If you prefer manual fetch calls
```

### Step 4: Create Production API Service

Create `src/lib/services/googlePlacesService.ts`:

```typescript
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
}
```

### Step 5: Update Store Locator Service

Replace the simulated methods in `src/lib/services/storeLocatorService.ts`:

```typescript
// Add this import at the top
import { GooglePlacesService } from './googlePlacesService';

// Replace the getCoordinatesFromZipCode method
private static async getCoordinatesFromZipCode(zipCode: string): Promise<{latitude: number, longitude: number} | null> {
  // Try Google Geocoding API first
  const coords = await GooglePlacesService.geocodeZipCode(zipCode);
  if (coords) {
    return coords;
  }

  // Fallback to hardcoded coordinates for development/testing
  return this.getFallbackCoordinates(zipCode);
}

// Replace the searchPlacesForChain method
private static async searchPlacesForChain(
  userCoords: {latitude: number, longitude: number},
  radiusMeters: number,
  chainName: string
): Promise<USStore[]> {
  try {
    // Use real Google Places API
    const places = await GooglePlacesService.findNearbyStores(
      userCoords.latitude,
      userCoords.longitude,
      radiusMeters,
      chainName
    );

    const stores: USStore[] = [];

    for (const place of places.slice(0, 2)) { // Limit to 2 per chain
      // Get detailed information
      const details = await GooglePlacesService.getPlaceDetails(place.place_id);
      
      if (details) {
        const store = await this.convertGooglePlaceToStore(place, details, userCoords);
        if (store) {
          stores.push(store);
        }
      }
    }

    return stores;
  } catch (error) {
    console.error(`Error searching for ${chainName}:`, error);
    // Fallback to simulated data for development
    return this.getSimulatedStoresForChain(userCoords, chainName, radiusMeters);
  }
}

// Add new method to convert Google Places data to USStore format
private static async convertGooglePlaceToStore(
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

    const store: USStore = {
      id: place.place_id,
      name: details.name || place.name,
      chain: this.detectChainFromName(details.name || place.name),
      address: addressParts[0] || details.formatted_address,
      city: addressParts[addressParts.length - 3] || 'Unknown',
      state: stateMatch?.[0] || 'CA',
      zipCode: zipMatch?.[0] || '00000',
      latitude: location.lat,
      longitude: location.lng,
      phone: details.formatted_phone_number,
      websiteUrl: details.website || this.getChainWebsite(details.name),
      supportsAlcohol: this.chainSupportsAlcohol(details.name),
      supportsDelivery: this.chainSupportsDelivery(details.name),
      supportsPickup: true,
      apiIntegration: false,
      cartBaseUrl: undefined,
      hours: this.convertGoogleHours(details.opening_hours),
      distance: Math.round(distance * 10) / 10
    };

    return store;
  } catch (error) {
    console.error('Error converting Google Place to store:', error);
    return null;
  }
}

// Add helper methods
private static detectChainFromName(name: string): SupportedStoreChain {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('target')) return 'target';
  if (nameLower.includes('walmart')) return 'walmart';
  if (nameLower.includes('kroger')) return 'kroger';
  if (nameLower.includes('total wine')) return 'total_wine';
  if (nameLower.includes('bevmo')) return 'bevmo';
  if (nameLower.includes('safeway')) return 'safeway';
  if (nameLower.includes('publix')) return 'publix';
  if (nameLower.includes('h-e-b') || nameLower.includes('heb')) return 'heb';
  if (nameLower.includes('meijer')) return 'meijer';
  
  // Default fallback
  return 'target';
}

private static convertGoogleHours(openingHours: any): Record<string, string> | undefined {
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

// Keep the original methods as fallbacks
private static getFallbackCoordinates(zipCode: string): {latitude: number, longitude: number} | null {
  // Your existing hardcoded coordinates logic here
  // This serves as a fallback when the API is unavailable
}
```

### Step 6: Add Caching (Optional but Recommended)

Create `src/lib/services/cacheService.ts`:

```typescript
// Simple in-memory cache for development
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
}

export const cache = new SimpleCache();

// Usage in storeLocatorService.ts:
// const cacheKey = `stores_${zipCode}_${radiusMiles}`;
// const cached = cache.get(cacheKey);
// if (cached) return cached;
// 
// const stores = await findStoresFromAPI();
// cache.set(cacheKey, stores, 1800); // Cache for 30 minutes
// return stores;
```

### Step 7: Add Error Handling and Rate Limiting

Update your store locator service with proper error handling:

```typescript
// Add retry logic
private static async withRetry<T>(
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

// Add rate limiting
private static lastApiCall = 0;
private static readonly MIN_API_INTERVAL = 100; // 100ms between calls

private static async rateLimitedApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
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
```

### Step 8: Environment Configuration

Update your `src/app.d.ts` to include environment types:

```typescript
declare global {
  namespace App {
    interface Locals {
      // existing locals
    }
    
    interface Platform {}
    
    interface PrivateEnv {
      GOOGLE_PLACES_API_KEY: string;
      GOOGLE_GEOCODING_API_KEY: string;
    }
    
    interface PublicEnv {}
  }
}
```

### Step 9: Testing Strategy

1. **Development Testing**
   ```bash
   # Test with your API key
   npm run dev
   # Try different zip codes to verify API integration
   ```

2. **API Quota Monitoring**
   - Monitor your Google Cloud Console for API usage
   - Set up billing alerts
   - Places API: $17 per 1,000 requests
   - Geocoding API: $5 per 1,000 requests

3. **Fallback Testing**
   - Test with invalid API key to ensure fallbacks work
   - Test with network issues

### Step 10: Production Deployment

1. **Environment Variables**
   ```bash
   # Set in your production environment
   export GOOGLE_PLACES_API_KEY="your_production_key"
   export GOOGLE_GEOCODING_API_KEY="your_production_key"
   ```

2. **API Key Security**
   - Use different API keys for development/production
   - Restrict keys to your production domains only
   - Monitor usage in Google Cloud Console

3. **Monitoring**
   - Set up logging for API failures
   - Monitor response times
   - Track API quota usage

## 💰 Cost Estimation

**Google Places API Pricing** (as of 2024):
- **Places Nearby Search**: $32 per 1,000 requests
- **Place Details**: $17 per 1,000 requests  
- **Geocoding**: $5 per 1,000 requests

**Example Monthly Costs**:
- 1,000 cocktail orders/month: ~$54/month
- 10,000 cocktail orders/month: ~$540/month

**Cost Optimization**:
- Cache results for 30 minutes to reduce API calls
- Limit to 3 stores per search instead of all chains
- Use fallback data for development/testing

## 🚀 Go-Live Checklist

- [ ] Google Cloud Project created
- [ ] APIs enabled (Places, Geocoding)
- [ ] API keys created and restricted
- [ ] Environment variables set
- [ ] Dependencies installed
- [ ] Code updated with real API calls
- [ ] Caching implemented
- [ ] Error handling added
- [ ] Testing completed
- [ ] Monitoring set up
- [ ] Production deployment ready

## 🔧 Quick Start Commands

```bash
# 1. Install dependencies
npm install @googlemaps/google-maps-services-js

# 2. Set environment variables
echo "GOOGLE_PLACES_API_KEY=your_key_here" >> .env
echo "GOOGLE_GEOCODING_API_KEY=your_key_here" >> .env

# 3. Test the implementation
npm run dev

# 4. Deploy to production
npm run build
```

This implementation will give you a production-ready store locator that finds real stores within any radius of any US location!

## Fail-fast startup validation

A runtime check in `src/hooks.server.ts` validates that `GOOGLE_PLACES_API_KEY` and `GOOGLE_GEOCODING_API_KEY` are set and non-empty. The application throws an explicit error on startup when these are missing, ensuring misconfigured deployments fail fast. Set these variables in all environments:
- Local development: `.env`
- CI/CD: pipeline or project secrets
- Production: hosting provider environment variables
