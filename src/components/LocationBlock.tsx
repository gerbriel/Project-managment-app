import React from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../app/supabaseClient';
import { getBoardLocations, updateCardLocation } from '@api/cards';
import type { ID } from '../types/models';
import { geocodeAddress, reverseGeocode } from '@api/geocoding';

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
  const center: LatLngExpression = [lat ?? 39.5296, lng ?? -119.8138];

  const othersQuery = useQuery({
    queryKey: ['board-locs', boardId],
    queryFn: () => getBoardLocations(boardId),
    enabled: !!boardId,
  });

  const mu = useMutation({
    mutationFn: (payload: { lat?: number | null; lng?: number | null; address?: string | null }) =>
      updateCardLocation(cardId, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && (q.queryKey.includes('card') || q.queryKey.includes('cards') || q.queryKey[0] === 'board-locs') });
    },
  });

  // Debounced geocode on address change
  const addrRef = React.useRef<number | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 text-sm">
        <input
          className="flex-1 rounded border border-app bg-surface-2 px-2 py-1"
          placeholder="Address"
          value={address ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            mu.mutate({ address: v });
            if (addrRef.current) window.clearTimeout(addrRef.current);
            addrRef.current = window.setTimeout(async () => {
              if (!v) return; // don't geocode empty
              const pt = await geocodeAddress(v);
              if (pt) mu.mutate({ lat: pt.lat, lng: pt.lng });
            }, 600);
          }}
        />
        <input
          className="w-28 rounded border border-app bg-surface-2 px-2 py-1"
          placeholder="Lat"
          value={lat ?? ''}
          onChange={(e) => mu.mutate({ lat: e.target.value ? parseFloat(e.target.value) : null })}
        />
        <input
          className="w-28 rounded border border-app bg-surface-2 px-2 py-1"
          placeholder="Lng"
          value={lng ?? ''}
          onChange={(e) => mu.mutate({ lng: e.target.value ? parseFloat(e.target.value) : null })}
        />
      </div>
  <div className="h-64 rounded overflow-hidden border border-neutral-800" onPointerDown={(e) => e.stopPropagation()} onPointerMove={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
        <MapContainer center={center} zoom={lat && lng ? 12 : 4} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickCapture onClick={async (la, ln) => {
            let addr = null;
            try { addr = await reverseGeocode(la, ln); } catch {}
            mu.mutate({ lat: la, lng: ln, address: addr });
          }} />
          {/* Current card marker */}
          {typeof lat === 'number' && typeof lng === 'number' && (
            <Marker position={[lat, lng] as LatLngExpression} />
          )}
          {/* Other board cards as pins */}
          {(othersQuery.data || []).map((p) =>
            p.id === cardId ? null : (
              <Marker key={p.id} position={[p.lat, p.lng] as LatLngExpression} />
            )
          )}
        </MapContainer>
      </div>
      <div className="text-xs text-muted">Click map to set the card location. Zoom out to see other cards on this board.</div>
    </div>
  );
}
