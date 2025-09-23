// Simple geocoding helpers using OpenStreetMap Nominatim public API
// Note: Be mindful of rate limits in production. We debounce calls in UI.

export type GeoPoint = { lat: number; lng: number; label?: string };

export async function geocodeAddress(q: string): Promise<GeoPoint | null> {
  if (!q.trim()) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
  const res = await fetch(url, {
    headers: {
      'Accept-Language': 'en',
      // User-Agent header cannot be set by browsers; Nominatim still accepts requests, but consider a proxy for heavy use.
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
  if (!data?.length) return null;
  const first = data[0];
  return { lat: parseFloat(first.lat), lng: parseFloat(first.lon), label: first.display_name };
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en' },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { display_name?: string };
  return data?.display_name ?? null;
}

export default { geocodeAddress, reverseGeocode };
