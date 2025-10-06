import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

async function withTimeout<T>(p: Promise<T>, ms = 10000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });
}

/**
 * This endpoint makes direct, minimal REST calls to Google Geocoding API
 * to surface precise error messages (without exposing keys).
 * It returns only status codes and error messages, never the key itself.
 */
export const GET: RequestHandler = async () => {
  const placesKey = env.GOOGLE_PLACES_API_KEY;
  const geocodeKey = env.GOOGLE_GEOCODING_API_KEY;

  const result: {
    hasPlacesKey: boolean;
    hasGeocodeKey: boolean;
    geocodeREST?: { httpStatus?: number; apiStatus?: string; error_message?: string; ok?: boolean };
    notes: string[];
  } = {
    hasPlacesKey: Boolean(placesKey),
    hasGeocodeKey: Boolean(geocodeKey),
    notes: [
      'No secrets are returned. Keys are read from env but not echoed.',
      'If httpStatus=403 with error_message about referrers or IP, the key restrictions are incorrect for server usage.',
      'For Vercel, use a server key: Application restrictions = None (or allow Vercel egress IPs, which are not fixed), API restrictions = Places + Geocoding.'
    ]
  };

  if (!geocodeKey) {
    return json(result);
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', '94105');
    url.searchParams.set('key', geocodeKey);

    const resp = await withTimeout(fetch(url.toString(), { method: 'GET' }), 10000);
    const httpStatus = resp.status;
    let body: any = null;
    try { body = await resp.json(); } catch { body = null; }

    result.geocodeREST = {
      httpStatus,
      apiStatus: body?.status,
      error_message: body?.error_message,
      ok: httpStatus === 200 && body?.status === 'OK'
    };
  } catch (e: any) {
    result.geocodeREST = {
      ok: false,
      error_message: e?.message || 'request failed'
    };
  }

  return json(result);
};
