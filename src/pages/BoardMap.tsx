import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Topbar from '@components/Topbar';
import { getBoardLocations } from '@api/cards';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

export default function BoardMap() {
  const { boardId } = useParams();
  const q = useQuery({
    queryKey: ['board-locs', boardId],
    queryFn: () => getBoardLocations(boardId!),
    enabled: !!boardId,
  });

  const points = q.data || [];
  const center = points.length ? [points[0].lat, points[0].lng] : [39.5296, -119.8138];

  return (
    <div className="min-h-screen bg-app text-app">
      <Topbar />
      <div className="p-4">
        <div className="h-[70vh] rounded overflow-hidden border border-app">
          <MapContainer center={center as any} zoom={points.length ? 8 : 4} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {points.map((p) => (
              <Marker key={p.id} position={[p.lat, p.lng] as any}>
                <Popup>{p.title}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
