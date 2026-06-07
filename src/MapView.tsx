import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Report, Spot } from './module_bindings/types';
import {
  STATUS_META,
  NO_DATA_COLOR,
  NO_DATA_RGB,
  BURST_MS,
  pinVisual,
  scoreToColor,
  scoreToRgb,
  scoreToLabel,
  confidence,
  tsToMs,
  type Composite,
} from './pulse';

function makeIcon(
  color: string,
  rgb: [number, number, number],
  vis: { core: number; aura: number; auraOpacity: number; glow: string },
  live: boolean,
  hot: boolean,
  selected: boolean,
  burst: boolean,
  waitMinutes: number | null,
  opacity: number
): L.DivIcon {
  const cls = [
    'pin',
    live ? 'pin--live' : '',
    hot ? 'pin--hot' : '',
    selected ? 'pin--selected' : '',
  ].join(' ');
  const style =
    `--c:${color};--rgb:${rgb[0]},${rgb[1]},${rgb[2]};` +
    `--core:${vis.core}px;--aura:${vis.aura}px;--aura-o:${vis.auraOpacity};--glow:${vis.glow};opacity:${opacity}`;
  return L.divIcon({
    className: 'pin-wrap',
    html: `<div class="${cls}" style="${style}">
      ${vis.aura > 0 ? '<span class="pin-aura"></span>' : ''}
      ${hot ? '<span class="pin-ring"></span>' : ''}
      ${burst ? '<span class="pin-burst"></span><span class="pin-burst pin-burst--2"></span>' : ''}
      <span class="pin-core"></span>
      ${waitMinutes != null ? `<span class="pin-wait">${waitMinutes}m</span>` : ''}
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    tooltipAnchor: [0, -16],
  });
}

function PinMarker({
  spot,
  comp,
  latest,
  waitMinutes,
  now,
  selected,
  onSelect,
}: {
  spot: Spot;
  comp: Composite | undefined;
  latest: Report | undefined;
  waitMinutes: number | null;
  now: number;
  selected: boolean;
  onSelect: (id: bigint) => void;
}) {
  const hasData = !!comp && comp.count > 0;
  const score = hasData ? comp!.score : 0;
  const conf = hasData ? confidence(comp!.weight) : 0;
  const color = hasData ? scoreToColor(score) : NO_DATA_COLOR;
  const rgb = hasData ? scoreToRgb(score) : NO_DATA_RGB;
  const vis = pinVisual(rgb, conf, hasData);
  const hot = false; // dots are a consistent size — no busy/quiet size change or ring
  const opacity = hasData ? 0.92 : 0.85; // color conveys busyness, not size
  // one-shot ripple when a brand-new report lands
  const burstKey = latest && now - tsToMs(latest.createdAt) <= BURST_MS ? latest.id.toString() : '';
  const colorKey = Math.round(score); // regenerate as the shade shifts

  const icon = useMemo(
    () => makeIcon(color, rgb, vis, hasData, hot, selected, burstKey !== '', waitMinutes, opacity),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colorKey, hasData, hot, selected, burstKey, waitMinutes, Math.round(conf * 20)]
  );

  return (
    <Marker
      position={[spot.latitude, spot.longitude]}
      icon={icon}
      eventHandlers={{ click: () => onSelect(spot.id) }}
    >
      <Tooltip className="pulse-tip" direction="top" opacity={1}>
        <div style={{ fontWeight: 600, color: 'var(--fg-1)' }}>{spot.name}</div>
        <div style={{ marginTop: 2 }}>
          {hasData ? (
            <span style={{ color }}>
              ● {Math.round(score)} · {STATUS_META[scoreToLabel(score)].label}
              <span style={{ color: 'var(--fg-3)' }}> · {comp!.count} in 2h</span>
            </span>
          ) : (
            <span style={{ color: NO_DATA_COLOR }}>● No data</span>
          )}
        </div>
      </Tooltip>
    </Marker>
  );
}

function PanToSelected({ spot, enabled }: { spot: Spot | null; enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!spot) return;
    map.setView([spot.latitude, spot.longitude], Math.max(map.getZoom(), 15), { animate: true });
    if (enabled) map.panBy([0, Math.round(map.getSize().y * 0.16)], { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot?.id, enabled]);
  return null;
}

// "You are here" marker.
const YOU_ICON = L.divIcon({
  className: 'pin-wrap',
  html: '<div class="you-dot"><span class="you-dot-ring"></span><span class="you-dot-core"></span></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Fix gray tiles: the map mounts inside a frame whose size settles after init.
function InvalidateOnMount() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

// Recenter on the user once their real location resolves.
function RecenterOnUser({ coords, active }: { coords: [number, number]; active: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (active) map.setView(coords, Math.max(map.getZoom(), 14), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, coords[0], coords[1]]);
  return null;
}

type Props = {
  spots: readonly Spot[];
  latestBySpot: Map<bigint, Report>;
  compositeBySpot: Map<bigint, Composite>;
  waitBySpot: Map<bigint, { minutes: number; ageMs: number }>;
  userCoords: [number, number];
  userIsReal: boolean;
  now: number;
  selectedId: bigint | null;
  selectedSpot: Spot | null;
  onSelect: (id: bigint) => void;
  panOnSelect: boolean;
};

export default function MapView({
  spots,
  latestBySpot,
  compositeBySpot,
  waitBySpot,
  userCoords,
  userIsReal,
  now,
  selectedId,
  selectedSpot,
  onSelect,
  panOnSelect,
}: Props) {
  return (
    <MapContainer
      center={userCoords}
      zoom={14}
      className="h-full w-full"
      scrollWheelZoom
      zoomControl={false}
      attributionControl
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      <InvalidateOnMount />
      <Marker position={userCoords} icon={YOU_ICON} interactive={false} zIndexOffset={500} />
      <RecenterOnUser coords={userCoords} active={userIsReal} />
      {spots.map(spot => (
        <PinMarker
          key={spot.id.toString()}
          spot={spot}
          comp={compositeBySpot.get(spot.id)}
          latest={latestBySpot.get(spot.id)}
          waitMinutes={waitBySpot.get(spot.id)?.minutes ?? null}
          now={now}
          selected={selectedId === spot.id}
          onSelect={onSelect}
        />
      ))}
      <PanToSelected spot={selectedSpot} enabled={panOnSelect} />
    </MapContainer>
  );
}
