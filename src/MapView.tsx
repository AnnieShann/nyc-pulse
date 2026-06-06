import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import type { Report, Spot } from './module_bindings/types';
import {
  STATUS_META,
  NO_DATA_COLOR,
  STALE_MS,
  colorForSpot,
  formatAge,
  tsToMs,
  type Status,
} from './lib';

// Herald Square, Manhattan.
const CENTER: [number, number] = [40.7484, -73.9879];

type Props = {
  spots: readonly Spot[];
  latestBySpot: Map<bigint, Report>;
  now: number;
  selectedId: bigint | null;
  onSelect: (id: bigint) => void;
};

export default function MapView({ spots, latestBySpot, now, selectedId, onSelect }: Props) {
  return (
    <MapContainer center={CENTER} zoom={14} className="map" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {spots.map(spot => {
        const latest = latestBySpot.get(spot.id);
        const fresh = latest && now - tsToMs(latest.createdAt) <= STALE_MS;
        const color = colorForSpot(latest, now);
        const selected = selectedId === spot.id;
        return (
          <CircleMarker
            key={spot.id.toString()}
            center={[spot.latitude, spot.longitude]}
            radius={selected ? 13 : 9}
            pathOptions={{
              color: selected ? '#111' : '#ffffff',
              weight: selected ? 3 : 1.5,
              fillColor: color,
              fillOpacity: 0.92,
            }}
            eventHandlers={{ click: () => onSelect(spot.id) }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1}>
              <div className="tip">
                <strong>{spot.name}</strong>
                <div>
                  {fresh && latest ? (
                    <>
                      <span style={{ color: STATUS_META[latest.status as Status]?.color }}>
                        ●
                      </span>{' '}
                      {STATUS_META[latest.status as Status]?.label ?? latest.status}
                      <span className="muted"> · {formatAge(now - tsToMs(latest.createdAt))}</span>
                    </>
                  ) : (
                    <span style={{ color: NO_DATA_COLOR }}>● no recent reports</span>
                  )}
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
