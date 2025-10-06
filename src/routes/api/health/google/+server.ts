import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { GooglePlacesService } from '$lib/services/googlePlacesService';

// Small helper so the route never hangs
function withTimeout<T>(p: Promise<T>, ms = 6000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });
}

export const GET: RequestHandler = async () => {
  const hasPlacesKey = Boolean(env.GOOGLE_PLACES_API_KEY);
  const hasGeocodeKey = Boolean(env.GOOGLE_GEOCODING_API_KEY);

  const diag: {
    hasPlacesKey: boolean;
    hasGeocodeKey: boolean;
    geocode?: { ok: boolean; status?: number; error?: string };
    nearby?: { ok: boolean; status?: number; error?: string; results?: number };
    details?: { ok: boolean; status?: number; error?: string };
    note: string;
  } = {
    hasPlacesKey,
    hasGeocodeKey,
    note: 'This endpoint performs minimal Google API calls to verify production configuration. No secrets are returned.'
  };

  // Only attempt external calls if keys appear present
  if (hasPlacesKey && hasGeocodeKey) {
    try {
      // 1) Geocode a known ZIP (SF SoMa)
      const geo = await withTimeout(GooglePlacesService.geocodeZipCode('94105'));
      diag.geocode = { ok: Boolean(geo) };
      if (!geo) {
        diag.geocode.error = 'geocodeZipCode returned null';
      } else {
        // 2) Nearby search for a common chain (within ~3mi)
        const nearby = await withTimeout(
          GooglePlacesService.findNearbyStores(geo.latitude, geo.longitude, 4800 /* ~3mi */, 'Target')
        );
        diag.nearby = { ok: Array.isArray(nearby), results: Array.isArray(nearby) ? nearby.length : 0 };
        if (!Array.isArray(nearby)) {
          diag.nearby.error = 'findNearbyStores returned non-array';
        } else if (nearby.length > 0 && nearby[0]?.place_id) {
          // 3) Fetch details for first result to ensure Details API works
          try {
            const detail = await withTimeout(GooglePlacesService.getPlaceDetails(nearby[0].place_id));
            diag.details = { ok: Boolean(detail) };
            if (!detail) diag.details.error = 'getPlaceDetails returned null';
          } catch (e: any) {
            diag.details = { ok: false, error: e?.message || 'details error' };
          }
        }
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error_message || e?.message || 'unknown error';
      const status = e?.response?.status;
      if (!diag.geocode) diag.geocode = { ok: false, status, error: msg };
      else if (!diag.nearby) diag.nearby = { ok: false, status, error: msg };
      else diag.details = { ok: false, status, error: msg };
    }
  }

  return json(diag);
};
