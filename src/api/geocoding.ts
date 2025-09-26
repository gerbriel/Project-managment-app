// Simple geocoding helpers using OpenStreetMap Nominatim public API
// Note: Be mindful of rate limits in production. We debounce calls in UI.

export type GeoPoint = { lat: number; lng: number; label?: string };

export type GeoSearchOptions = {
  countryCodes?: string; // e.g., 'us'
  // Provide either a center to create a bias box or an explicit bbox [south, west, north, east]
  biasCenter?: { lat: number; lng: number; radiusDeg?: number };
  bbox?: [number, number, number, number];
  limit?: number;
};

function buildNominatimParams(q: string, opts?: GeoSearchOptions, defaultLimit = 1) {
  const p = new URLSearchParams();
  p.set('format', 'json');
  p.set('q', q);
  p.set('addressdetails', '1');
  p.set('limit', String(opts?.limit ?? defaultLimit));
  if (opts?.countryCodes) p.set('countrycodes', opts.countryCodes);
  // bias via bbox
  let bbox: [number, number, number, number] | undefined = opts?.bbox;
  let fromBias = false;
  if (!bbox && opts?.biasCenter) {
    const r = Math.max(0.05, Math.min(2, opts.biasCenter.radiusDeg ?? 0.5));
    const s = opts.biasCenter.lat - r;
    const n = opts.biasCenter.lat + r;
    const w = opts.biasCenter.lng - r;
    const e = opts.biasCenter.lng + r;
    bbox = [s, w, n, e];
    fromBias = true;
  }
  if (bbox) {
    p.set('viewbox', `${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]}`); // lon,lat,lon,lat
    // Only strictly bound when explicit bbox is provided; for bias, leave unbounded for better results
    if (!fromBias) p.set('bounded', '1');
  }
  return p.toString();
}

export async function geocodeAddress(q: string, opts?: GeoSearchOptions): Promise<GeoPoint | null> {
  if (!q.trim()) return null;
  const params = buildNominatimParams(q, { countryCodes: 'us', ...opts }, 1);
  const url = `https://nominatim.openstreetmap.org/search?${params}`;
  console.log('Geocoding URL:', url);
  
  try {
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
        // User-Agent header cannot be set by browsers; Nominatim still accepts requests, but consider a proxy for heavy use.
      },
    });
    
    console.log('Geocoding response status:', res.status);
    if (!res.ok) {
      console.error('Geocoding response not ok:', res.statusText);
      return null;
    }
    
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    console.log('Geocoding response data:', data);
    
    if (!data?.length) {
      console.log('No geocoding results found');
      return null;
    }
    
    const first = data[0];
    const result = { lat: parseFloat(first.lat), lng: parseFloat(first.lon), label: first.display_name };
    console.log('Geocoding result:', result);
    return result;
  } catch (error) {
    console.error('Geocoding fetch error:', error);
    return null;
  }
}

export async function searchAddress(q: string, limit = 5, opts?: GeoSearchOptions): Promise<GeoPoint[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const params = buildNominatimParams(trimmed, { countryCodes: 'us', limit, ...opts }, limit);
  const url = `https://nominatim.openstreetmap.org/search?${params}`;
  console.log('Search geocoding URL:', url);
  const res = await fetch(url, {
    headers: {
      'Accept-Language': 'en',
    },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
  return (data || []).map((d) => ({ lat: parseFloat(d.lat), lng: parseFloat(d.lon), label: d.display_name }));
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en' },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { display_name?: string };
  return data?.display_name ?? null;
}

export default { geocodeAddress, reverseGeocode };
