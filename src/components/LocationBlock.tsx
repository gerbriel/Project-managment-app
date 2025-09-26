import React from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { LatLngExpression } from 'leaflet';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../app/supabaseClient';
import { getBoardLocations, updateCardLocation } from '@api/cards';
import type { ID } from '../types/models';
import { geocodeAddress, reverseGeocode, searchAddress, type GeoSearchOptions } from '@api/geocoding';

type Props = {
  cardId: ID;
  boardId: ID;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  title?: string;
};

function ClickCapture({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationBlock({ cardId, boardId, lat, lng, address, title }: Props) {
  const qc = useQueryClient();
  const defaultCenter: LatLngExpression = [39.5296, -119.8138];

  const othersQuery = useQuery({
    queryKey: ['board-locs', boardId],
    queryFn: () => getBoardLocations(boardId),
    enabled: !!boardId,
  });

  const [missingColumns, setMissingColumns] = React.useState(false);
  const mu = useMutation({
    mutationFn: (payload: { lat?: number | null; lng?: number | null; address?: string | null }) => {
      console.log('LocationBlock: Mutation called with payload:', payload);
      return updateCardLocation(cardId, payload);
    },
    onSuccess: async (data) => {
      if ((data as any)?.skippedDueToMissingColumns) {
        setMissingColumns(true);
        console.warn('LocationBlock: Save skipped because location columns are missing in DB.');
        return;
      }
      console.log('LocationBlock: Mutation successful:', data);
      await qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && (q.queryKey.includes('card') || q.queryKey.includes('cards') || q.queryKey[0] === 'board-locs') });
    },
    onError: (error) => {
      console.error('LocationBlock: Mutation error:', error);
    },
  });

  // Debounced geocode on address change
  const addrRef = React.useRef<number | null>(null);
  const [query, setQuery] = React.useState(address ?? '');
  const [open, setOpen] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<Array<{ label: string; lat: number; lng: number }>>([]);
  const [loc, setLoc] = React.useState<{ lat: number; lng: number } | null>(
    typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null
  );
  const propAddrRef = React.useRef(address ?? '');
  const propLocRef = React.useRef<{ lat: number | null; lng: number | null }>({ lat: lat ?? null, lng: lng ?? null });

  React.useEffect(() => {
    setQuery(address ?? '');
    propAddrRef.current = address ?? '';
  }, [address]);

  React.useEffect(() => {
    if (typeof lat === 'number' && typeof lng === 'number') setLoc({ lat, lng });
    else setLoc(null);
    propLocRef.current = { lat: lat ?? null, lng: lng ?? null };
  }, [lat, lng]);

  function FitToPins({ points }: { points: Array<{ lat: number; lng: number }> }) {
    const map = useMap();
    React.useEffect(() => {
      if (!points.length) return;
      if (points.length === 1) {
        map.setView([points[0].lat, points[0].lng], Math.max(map.getZoom(), 14));
      } else {
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14, animate: true });
      }
    }, [points, map]);
    return null;
  }

  async function commitFromState() {
    const trimmed = query.trim();
    console.log('LocationBlock: commitFromState called with query:', trimmed);
    
    // Nothing typed and no pin: clear if server has something
    if (!trimmed) {
      const hadAddr = (propAddrRef.current || '').trim().length > 0;
      const hadPin = typeof propLocRef.current.lat === 'number' || typeof propLocRef.current.lng === 'number';
      if (hadAddr || hadPin) {
        console.log('LocationBlock: Clearing location');
        setLoc(null);
        mu.mutate({ address: null, lat: null, lng: null });
      }
      return;
    }
    
    // If we already have a pin, just persist address text
    if (loc) {
      console.log('LocationBlock: Updating address for existing pin:', { address: trimmed, lat: loc.lat, lng: loc.lng });
      mu.mutate({ address: trimmed, lat: loc.lat, lng: loc.lng });
      return;
    }
    
    // Otherwise, geocode to create a pin then persist
    console.log('LocationBlock: Geocoding address:', trimmed);
    try {
      // Build a bias based on current known points (current loc or other board pins)
      const others = (othersQuery.data || []).filter((p: any) => typeof p.lat === 'number' && typeof p.lng === 'number');
      const bias: GeoSearchOptions | undefined = loc
        ? { biasCenter: { lat: (loc as any).lat as number, lng: (loc as any).lng as number, radiusDeg: 0.6 } }
        : others.length
        ? { biasCenter: { lat: others[0].lat as number, lng: others[0].lng as number, radiusDeg: 1 } }
        : undefined;
      const pt = await geocodeAddress(trimmed, bias);
      if (pt) {
        console.log('LocationBlock: Geocoding successful:', pt);
        setLoc({ lat: pt.lat, lng: pt.lng });
        // Use the user's input as the address, not the full display name
        mu.mutate({ lat: pt.lat, lng: pt.lng, address: trimmed });
      } else {
        console.log('LocationBlock: Geocoding failed, saving address only');
        mu.mutate({ address: trimmed });
      }
    } catch (error) {
      console.error('LocationBlock: Geocoding error:', error);
      mu.mutate({ address: trimmed });
    }
  }

  // Commit any pending changes on unmount (e.g., if modal closes without blur)
  React.useEffect(() => {
    return () => {
      void commitFromState();
    };
  }, [query, loc]);

  return (
    <div className="space-y-2">
      <div className="relative text-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-fg-muted">📍 Card Location</span>
          {loc && (
            <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
              Located
            </span>
          )}
        </div>
        <input
          className="w-full rounded border border-app bg-surface-2 px-3 py-2 placeholder-fg-muted/60"
          placeholder="Enter address or location..."
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            if (addrRef.current) window.clearTimeout(addrRef.current);
            addrRef.current = window.setTimeout(async () => {
              const trimmed = v.trim();
              if (!trimmed) {
                setSuggestions([]);
                setOpen(false);
                // Clear pin when address is cleared
                setLoc(null);
                return;
              }
              // fetch suggestions for autocomplete with local bias
              const others = (othersQuery.data || []).filter((p: any) => typeof p.lat === 'number' && typeof p.lng === 'number');
              const bias: GeoSearchOptions | undefined = loc
                ? { biasCenter: { lat: (loc as any).lat as number, lng: (loc as any).lng as number, radiusDeg: 0.6 } }
                : others.length
                ? { biasCenter: { lat: others[0].lat as number, lng: others[0].lng as number, radiusDeg: 1 } }
                : undefined;
              const results = await searchAddress(trimmed, 5, bias);
              setSuggestions(results.map(r => ({ label: r.label || `${r.lat},${r.lng}` , lat: r.lat, lng: r.lng })));
              setOpen(results.length > 0);
            }, 300);
          }}
          onFocus={() => {
            if (suggestions.length) setOpen(true);
          }}
          onBlur={async () => {
            // Close suggestions shortly after blur to allow click
            setTimeout(() => setOpen(false), 150);
            await commitFromState();
          }}
        />
        {open && suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded border border-app bg-surface-1 shadow">
            {suggestions.map((s, idx) => (
              <button
                key={`${s.lat}-${s.lng}-${idx}`}
                type="button"
                className="block w-full cursor-pointer px-2 py-1 text-left hover:bg-surface-3"
                onMouseDown={(e) => e.preventDefault()} // prevent input blur before click
                onClick={() => {
                  setQuery(s.label);
                  setLoc({ lat: s.lat, lng: s.lng });
                  mu.mutate({ address: s.label, lat: s.lat, lng: s.lng });
                  setOpen(false);
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="h-64 rounded overflow-hidden border border-neutral-800" onPointerDown={(e) => e.stopPropagation()} onPointerMove={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
        <MapContainer center={(loc ? [loc.lat, loc.lng] : defaultCenter) as LatLngExpression} zoom={loc ? 12 : 4} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickCapture onClick={async (la, ln) => {
            let addr = null;
            try { addr = await reverseGeocode(la, ln); } catch {}
            setLoc({ lat: la, lng: ln });
            mu.mutate({ lat: la, lng: ln, address: addr });
          }} />
          <FitToPins points={React.useMemo(() => {
            const others = (othersQuery.data || []).filter((p: any) => typeof p.lat === 'number' && typeof p.lng === 'number').map((p: any) => ({ lat: p.lat as number, lng: p.lng as number }));
            // Ensure current location is included in case othersQuery hasn't updated yet
            if (loc) {
              // Avoid adding exact duplicate point if present; simple check
              const has = others.some((o: any) => Math.abs(o.lat - loc.lat) < 1e-9 && Math.abs(o.lng - loc.lng) < 1e-9);
              return has ? others : [...others, loc];
            }
            return others;
          }, [othersQuery.data, loc])} />
          {/* Current card marker */}
          {loc && (
            <Marker position={[loc.lat, loc.lng] as LatLngExpression} />
          )}
          {/* Other board cards as pins */}
          {(othersQuery.data || []).map((p) =>
            p.id === cardId ? null : (
              <Marker key={p.id} position={[p.lat, p.lng] as LatLngExpression} />
            )
          )}
        </MapContainer>
      </div>

      <div className="text-xs text-fg-muted bg-surface-1 p-2 rounded">
        💡 <strong>How to use:</strong> Type an address above or click the map to set location. 
        Zoom out to see all board locations as pins.
        {othersQuery.data && othersQuery.data.length > 1 && (
          <span className="block mt-1 text-green-600">
            Found {othersQuery.data.length - 1} other locations on this board
          </span>
        )}
        {missingColumns && (
          <div className="mt-2 text-amber-600">
            Saving is currently disabled because the database is missing location columns on the cards table.
            Ask an admin to run scripts/add-location-columns.sql in Supabase SQL editor, then refresh.
          </div>
        )}
      </div>
    </div>
  );
}
