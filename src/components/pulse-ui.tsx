import { useState, type CSSProperties, type ReactNode } from 'react';
import { Camera, Check, Globe, MapPin, Navigation, Search, X } from 'lucide-react';
import type { Photo, Report } from '../module_bindings/types';
import {
  STATUS_META,
  STATUSES,
  NO_DATA_COLOR,
  NO_DATA_TINT,
  HOT_WINDOW_MS,
  atHandle,
  formatAge,
  formatCount,
  scoreToColor,
  scoreToLabel,
  tsToMs,
  type Status,
} from '../pulse';
import { useAnimatedNumber } from '../lib/useAnimatedNumber';

type TagStatus = Status | 'stale';
function meta(s: TagStatus) {
  if (s === 'stale')
    return { label: 'No data', color: NO_DATA_COLOR, glow: 'none', tint: NO_DATA_TINT };
  return STATUS_META[s];
}

/* Wordmark — the app name "Dionysus". */
export function Wordmark({ size = 18 }: { size?: number }) {
  return (
    <span
      style={{
        fontWeight: 800,
        fontSize: size,
        letterSpacing: '-0.02em',
        color: 'var(--pulse)',
        textShadow: '0 0 14px var(--pulse-glow)',
        lineHeight: 1.05,
      }}
    >
      Dionysus
    </span>
  );
}

/* OnlinePill — pulsing cyan dot + monospace count (smoothly tweened) + eyebrow. */
export function OnlinePill({ count }: { count: number }) {
  const shown = Math.round(useAnimatedNumber(count));
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 'var(--tap-min)',
        padding: '0 12px 0 10px',
        height: 36,
        borderRadius: 'var(--radius-pill)',
        background: 'var(--glass-raised)',
        border: '1px solid var(--line-2)',
        backdropFilter: 'blur(var(--blur-control))',
        WebkitBackdropFilter: 'blur(var(--blur-control))',
      }}
    >
      <span
        className="breathe"
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: 'var(--pulse)',
          boxShadow: 'var(--glow-pulse)',
        }}
      />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>
        {formatCount(shown)}
      </span>
      <span
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--fg-2)',
          fontWeight: 600,
        }}
      >
        online
      </span>
    </div>
  );
}

/* StatusTag — the vibe pill: dot + label on a tinted capsule. */
export function StatusTag({
  status,
  size = 'md',
  style,
}: {
  status: TagStatus;
  size?: 'sm' | 'md' | 'lg';
  style?: CSSProperties;
}) {
  const s = meta(status);
  const z = {
    sm: { pad: '3px 8px 3px 7px', font: 11, dot: 6, gap: 6 },
    md: { pad: '5px 11px 5px 9px', font: 13, dot: 8, gap: 7 },
    lg: { pad: '7px 14px 7px 12px', font: 14, dot: 9, gap: 8 },
  }[size];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: z.gap,
        padding: z.pad,
        borderRadius: 'var(--radius-pill)',
        background: s.tint,
        border: `1px solid ${s.color}`,
        ...style,
      }}
    >
      <span
        style={{
          width: z.dot,
          height: z.dot,
          borderRadius: 999,
          background: s.color,
          boxShadow: s.glow,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: z.font,
          fontWeight: 600,
          letterSpacing: '0.01em',
          color: s.color,
        }}
      >
        {s.label}
      </span>
    </span>
  );
}

/* StatusButton — one of the four big report buttons. Tinted, fills + glows when selected. */
export function StatusButton({
  status,
  selected,
  onClick,
}: {
  status: Status;
  selected: boolean;
  onClick: () => void;
}) {
  const s = STATUS_META[status];
  return (
    <button
      type="button"
      onClick={onClick}
      className="active:scale-[0.96]"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        minHeight: 60,
        padding: '10px 8px',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        background: selected ? s.color : s.tint,
        border: `1.5px solid ${selected ? s.color : 'transparent'}`,
        boxShadow: selected ? s.glow : 'none',
        transition:
          'transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), background var(--dur-fast) var(--ease-out)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        style={{
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: selected ? 'var(--fg-on-accent)' : s.color,
        }}
      >
        {s.label}
      </span>
    </button>
  );
}

/* Primary CTA — cyan pulse button that glows. */
export function PulseButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="active:scale-[0.97]"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: 52,
        borderRadius: 'var(--radius-lg)',
        fontSize: 16,
        fontWeight: 600,
        letterSpacing: '-0.02em',
        color: 'var(--fg-on-accent)',
        background: 'var(--accent-ink)',
        boxShadow: disabled ? 'none' : 'var(--shadow-card)',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: '1px solid transparent',
        transition: 'transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </button>
  );
}

/* Segmented switch (generic). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ k: T; label: string }>;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        gap: 4,
        padding: 4,
        background: 'var(--ink-800)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--line-1)',
      }}
    >
      {options.map(o => {
        const on = value === o.k;
        return (
          <button
            key={o.k}
            type="button"
            onClick={() => onChange(o.k)}
            className="press"
            style={{
              height: 38,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: on ? 'var(--fg-on-accent)' : 'var(--fg-2)',
              background: on ? 'var(--accent-ink)' : 'transparent',
              boxShadow: on ? 'var(--shadow-card)' : 'none',
              transition: 'all var(--dur-fast) var(--ease-out)',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* HotRow — ranked row: numeral, venue + meta, status tag, glowing left edge. */
export function HotRow({
  rank,
  venue,
  meta: metaText,
  status,
  onClick,
}: {
  rank: number;
  venue: string;
  meta: string;
  status: Status;
  onClick: () => void;
}) {
  const s = STATUS_META[status];
  return (
    <button
      type="button"
      onClick={onClick}
      className="hot-row"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        minHeight: 'var(--tap-min)',
        padding: '12px 14px 12px 18px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--ink-600)',
        border: '1px solid var(--line-1)',
        cursor: 'pointer',
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: s.color,
          boxShadow: s.glow,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--fg-3)',
          width: 22,
          flexShrink: 0,
        }}
      >
        {rank}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--fg-1)',
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {venue}
        </span>
        <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>{metaText}</span>
      </span>
      <StatusTag status={status} size="sm" />
    </button>
  );
}

/* CategoryChips — mobile-friendly, horizontally scrollable filter chips. */
export function CategoryChips({
  categories,
  hidden,
  allOn,
  onToggle,
  onAll,
}: {
  categories: string[];
  hidden: Set<string>;
  allOn: boolean;
  onToggle: (c: string) => void;
  onAll: () => void;
}) {
  const chip = (active: boolean): CSSProperties => ({
    flexShrink: 0,
    height: 34,
    padding: '0 13px',
    borderRadius: 'var(--radius-pill)',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    textTransform: 'capitalize',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    background: 'var(--glass-raised)',
    border: `1px solid ${active ? 'var(--line-2)' : 'var(--line-1)'}`,
    color: active ? 'var(--fg-1)' : 'var(--fg-3)',
    opacity: active ? 1 : 0.55,
    backdropFilter: 'blur(var(--blur-control))',
    WebkitBackdropFilter: 'blur(var(--blur-control))',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  });
  return (
    <div
      className="pointer-events-auto no-scrollbar"
      style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, maxWidth: '100%' }}
    >
      <button type="button" className="press" onClick={onAll} style={chip(allOn)}>
        All
      </button>
      {categories.map(c => {
        const active = !hidden.has(c);
        return (
          <button key={c} type="button" className="press" onClick={() => onToggle(c)} style={chip(active)}>
            {active && (
              <span
                style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pulse)', boxShadow: 'var(--glow-pulse)' }}
              />
            )}
            {c}
          </button>
        );
      })}
    </div>
  );
}

/* FeedRow — status tag, venue, mono time, cyan @handle, optional note. */
export function FeedRow({
  status,
  venue,
  handle,
  time,
  note,
  confirms,
  isNew,
  onClick,
  onConfirm,
}: {
  status: Status;
  venue: string;
  handle: string;
  time: string;
  note?: string;
  confirms: number;
  isNew?: boolean;
  onClick: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`feed-row${isNew ? ' feed-enter' : ''}`}
      style={{
        display: 'flex',
        gap: 12,
        padding: '12px 4px',
        borderBottom: '1px solid var(--line-1)',
        cursor: 'pointer',
      }}
    >
      <div style={{ paddingTop: 2, flexShrink: 0 }}>
        <StatusTag status={status} size="sm" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--fg-1)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {venue}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--fg-3)',
              marginLeft: 'auto',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {time}
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--pulse)' }}>
          {handle}
        </span>
        {note && (
          <span style={{ fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.45 }}>{note}</span>
        )}
      </div>
      <ConfirmChip
        confirms={confirms}
        onConfirm={onConfirm}
        style={{ alignSelf: 'center', flexShrink: 0 }}
      />
    </div>
  );
}

/* ConfirmChip — "Still accurate" tap + count (F8). */
export function ConfirmChip({
  confirms,
  onConfirm,
  label,
  style,
}: {
  confirms: number;
  onConfirm: () => void;
  label?: string;
  style?: CSSProperties;
}) {
  const on = confirms > 0;
  return (
    <button
      type="button"
      className="press"
      title="Still accurate"
      onClick={e => {
        e.stopPropagation();
        onConfirm();
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: label ? '7px 12px' : '6px 10px',
        minHeight: label ? 36 : 32,
        borderRadius: 'var(--radius-pill)',
        background: on ? 'var(--pulse-tint)' : 'var(--ink-600)',
        border: `1px solid ${on ? 'var(--line-pulse)' : 'var(--line-1)'}`,
        color: on ? 'var(--pulse)' : 'var(--fg-2)',
        fontFamily: 'var(--font-mono)',
        fontSize: label ? 13 : 12,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <Check size={13} strokeWidth={2.5} />
      {label && <span style={{ fontFamily: 'var(--font-sans)' }}>{label}</span>}
      {confirms}
    </button>
  );
}

/* ActivityStrip — a tiny sparkline of recent reports + a "N in last 30 min" pulse. */
export function ActivityStrip({ reports, now }: { reports: Report[]; now: number }) {
  const windowCount = reports.filter(r => now - tsToMs(r.createdAt) <= HOT_WINDOW_MS).length;
  const bars = reports.slice(0, 14).reverse(); // oldest -> newest of the recent set
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 20 }}>
        {bars.length === 0 ? (
          <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>—</span>
        ) : (
          bars.map((r, i) => {
            const recency = Math.max(0, 1 - (now - tsToMs(r.createdAt)) / (60 * 60 * 1000));
            const h = 6 + Math.round(recency * 14);
            const c = STATUS_META[r.status as Status]?.color ?? 'var(--fg-3)';
            return (
              <span
                key={i}
                style={{ width: 3, height: h, borderRadius: 2, background: c, opacity: 0.4 + recency * 0.6 }}
              />
            );
          })
        )}
      </div>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--fg-3)',
        }}
      >
        {windowCount > 0 && (
          <span
            className="breathe"
            style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pulse)', boxShadow: 'var(--glow-pulse)' }}
          />
        )}
        {windowCount > 0 ? `${windowCount} in last 30 min` : 'quiet lately'}
      </span>
    </div>
  );
}

/* SearchBar — find places by name/category (glass pill). */
export function SearchBar({
  value,
  onChange,
  onClear,
}: {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  return (
    <div
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height: 42,
        padding: '0 12px',
        borderRadius: 'var(--radius-pill)',
        background: 'var(--glass-surface)',
        border: '1px solid var(--line-2)',
        backdropFilter: 'blur(var(--blur-control))',
        WebkitBackdropFilter: 'blur(var(--blur-control))',
      }}
    >
      <Search size={16} color="var(--fg-3)" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search places…"
        aria-label="Search places"
        style={{
          flex: 1,
          minWidth: 0,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: 'var(--fg-1)',
          fontSize: 14,
          fontFamily: 'var(--font-sans)',
        }}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="press"
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 22,
            height: 22,
            flexShrink: 0,
            borderRadius: 999,
            background: 'var(--ink-600)',
            border: 'none',
            color: 'var(--fg-2)',
            cursor: 'pointer',
          }}
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

export type SearchItem = {
  id: bigint;
  name: string;
  category: string;
  status: Status | 'stale';
  waitMinutes: number | null;
};

/* SearchResults — matching places with status, wait, and heat. */
export function SearchResults({
  items,
  onPick,
}: {
  items: SearchItem[];
  onPick: (id: bigint) => void;
}) {
  return (
    <div
      className="no-scrollbar"
      style={{
        pointerEvents: 'auto',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--glass-surface)',
        border: '1px solid var(--line-1)',
        boxShadow: 'var(--inset-top), var(--shadow-card)',
        backdropFilter: 'blur(var(--blur-sheet))',
        WebkitBackdropFilter: 'blur(var(--blur-sheet))',
        maxHeight: '52vh',
        overflowY: 'auto',
        padding: 6,
      }}
    >
      {items.length === 0 ? (
        <div style={{ padding: '14px 10px', fontSize: 14, color: 'var(--fg-3)' }}>
          No places match.
        </div>
      ) : (
        items.map(it => {
          const m = it.status === 'stale' ? null : STATUS_META[it.status];
          const dot = m ? m.color : NO_DATA_COLOR;
          return (
            <button
              key={it.id.toString()}
              type="button"
              className="srow press"
              onClick={() => onPick(it.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                textAlign: 'left',
                minHeight: 48,
                padding: '8px 10px',
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  flexShrink: 0,
                  borderRadius: 999,
                  background: dot,
                  boxShadow: m ? m.glow : 'none',
                }}
              />
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--fg-1)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {it.name}
                </span>
                <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                  <span style={{ color: m ? m.color : 'var(--fg-3)' }}>
                    {m ? m.label : 'No data'}
                  </span>
                  {it.waitMinutes != null ? ` · ~${it.waitMinutes}m wait` : ''}
                  <span style={{ textTransform: 'capitalize' }}> · {it.category}</span>
                </span>
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}

/* PhotoStrip — recent live photos of a place + an "Add photo" (camera) tile. */
export function PhotoStrip({
  photos,
  now,
  onAdd,
}: {
  photos: Photo[];
  now: number;
  onAdd: () => void;
}) {
  const cell: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    background: 'var(--ink-800)',
  };
  const photoTile = (p: Photo) => (
    <div style={cell}>
      <img src={p.data} alt="spot" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <span
        style={{
          position: 'absolute',
          left: 8,
          bottom: 8,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 600,
          color: '#fff',
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 999,
          padding: '2px 7px',
        }}
      >
        {formatAge(now - tsToMs(p.createdAt))}
      </span>
    </div>
  );
  const addTile = (
    <button
      type="button"
      onClick={onAdd}
      className="press"
      style={{
        ...cell,
        border: '1px dashed var(--line-2)',
        background: 'var(--ink-700)',
        color: 'var(--fg-2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        cursor: 'pointer',
      }}
    >
      <Camera size={24} />
      <span style={{ fontSize: 12, fontWeight: 600 }}>Add photo</span>
    </button>
  );

  // Big photo on the left + up to two stacked on the right (Google-style).
  const tiles: React.ReactNode[] = [...photos.map(p => photoTile(p)), addTile].slice(0, 3);
  const big = tiles[0];
  const right = tiles.slice(1);

  if (tiles.length === 1) {
    return <div style={{ height: 150 }}>{big}</div>;
  }
  return (
    <div style={{ display: 'flex', gap: 8, height: 200 }}>
      <div style={{ flex: '1.65 1 0', minWidth: 0 }}>{big}</div>
      <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {right.map((t, i) => (
          <div key={i} style={{ flex: 1, minHeight: 0 }}>
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

const placeLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 34,
  padding: '0 14px',
  borderRadius: 'var(--radius-pill)',
  border: '1px solid var(--line-2)',
  background: 'var(--ink-700)',
  color: 'var(--fg-1)',
  fontSize: 13,
  fontWeight: 600,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

/* PlaceLinks — Google-style action pills. */
export function PlaceLinks({
  website,
  directionsUrl,
  mapsUrl,
}: {
  website?: string;
  directionsUrl: string;
  mapsUrl: string;
}) {
  return (
    <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
      {website && (
        <a href={website} target="_blank" rel="noreferrer" className="press" style={placeLinkStyle}>
          <Globe size={14} color="var(--pulse)" /> Website
        </a>
      )}
      <a href={directionsUrl} target="_blank" rel="noreferrer" className="press" style={placeLinkStyle}>
        <Navigation size={14} color="var(--pulse)" /> Directions
      </a>
      <a href={mapsUrl} target="_blank" rel="noreferrer" className="press" style={placeLinkStyle}>
        <MapPin size={14} color="var(--pulse)" /> Maps
      </a>
    </div>
  );
}

/* PlaceDetails — blurb + amenity chips. */
export function PlaceDetails({ blurb, tags }: { blurb?: string; tags?: string[] }) {
  if (!blurb && !(tags && tags.length)) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {blurb && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--fg-2)' }}>{blurb}</p>}
      {tags && tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {tags.map(t => (
            <span
              key={t}
              style={{
                fontSize: 12,
                color: 'var(--fg-2)',
                background: 'var(--ink-700)',
                border: '1px solid var(--line-1)',
                borderRadius: 'var(--radius-pill)',
                padding: '3px 10px',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* CompositeHeader — big composite score + nearest label in the heat color. */
export function CompositeHeader({
  score,
  count,
  weight,
  waitMinutes,
}: {
  score: number;
  count: number;
  weight: number;
  waitMinutes: number | null;
}) {
  // No reports yet → render nothing (no "No data" block).
  if (count === 0) return null;
  const color = scoreToColor(score);
  const label = STATUS_META[scoreToLabel(score)].label;
  const lowConf = count < 2 || weight < 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 40, fontWeight: 800, color, letterSpacing: '-0.03em', lineHeight: 1 }}>
          {Math.round(score)}
        </span>
        <span style={{ fontSize: 20, fontWeight: 700, color }}>· {label}</span>
        {waitMinutes != null && (
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--fg-2)',
              background: 'var(--ink-700)',
              border: '1px solid var(--line-1)',
              borderRadius: 'var(--radius-pill)',
              padding: '3px 9px',
            }}
          >
            ~{waitMinutes}m wait
          </span>
        )}
      </div>
      <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
        based on {count} report{count === 1 ? '' : 's'} in the last 2h
        {lowConf && <span style={{ color: '#ffa52c' }}> · low confidence</span>}
      </span>
    </div>
  );
}

/* DistributionBar — stacked split of how many reports said each status. */
export function DistributionBar({ counts }: { counts: Record<Status, number> }) {
  const total = STATUSES.reduce((s, k) => s + counts[k], 0);
  if (!total) return null;
  return (
    <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'var(--ink-700)' }}>
      {STATUSES.map(k =>
        counts[k] > 0 ? (
          <div
            key={k}
            title={`${STATUS_META[k].label}: ${counts[k]}`}
            style={{ width: `${(counts[k] / total) * 100}%`, background: STATUS_META[k].color }}
          />
        ) : null
      )}
    </div>
  );
}

/* History — newest-first report rows (2 shown + Load more), within the window. */
export function History({
  reports,
  now,
  resolveHandle,
  confirmFor,
  onConfirm,
}: {
  reports: Report[];
  now: number;
  resolveHandle: (idHex: string) => string;
  confirmFor: (id: bigint) => number;
  onConfirm: (id: bigint) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (reports.length === 0) return null;
  const shown = expanded ? reports : reports.slice(0, 3);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {shown.map(r => {
        const handle = resolveHandle(r.reporter.toHexString());
        const initials = handle.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || '··';
        const text = r.note?.trim() ? r.note : `Called it ${STATUS_META[r.status as Status].label}.`;
        return (
          <div
            key={r.id.toString()}
            style={{
              background: 'var(--ink-600)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div className="flex items-center" style={{ gap: 10 }}>
              <span
                className="grid place-items-center shrink-0"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  background: 'var(--accent-ink)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {initials}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)' }}>{atHandle(handle)}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{formatAge(now - tsToMs(r.createdAt))} ago</div>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 15, color: 'var(--fg-1)', lineHeight: 1.45 }}>{text}</p>
            <ConfirmChip
              confirms={confirmFor(r.id)}
              onConfirm={() => onConfirm(r.id)}
              label="Still accurate"
              style={{ alignSelf: 'flex-start' }}
            />
          </div>
        );
      })}
      {reports.length > 3 && !expanded && (
        <button
          type="button"
          className="press"
          onClick={() => setExpanded(true)}
          style={{
            alignSelf: 'flex-start',
            background: 'none',
            border: 'none',
            color: 'var(--pulse)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Load more ({reports.length - 3})
        </button>
      )}
    </div>
  );
}

/* Toast — "Vibe dropped." confirmation. */
export function Toast({
  show,
  status,
  venue,
  label = 'Saved.',
}: {
  show: boolean;
  status: Status | null;
  venue: string | null;
  label?: string;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        right: 12,
        top: show ? 12 : -10,
        zIndex: 2000,
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(-8px)',
        transition:
          'opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out), top var(--dur-base) var(--ease-out)',
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--glass-surface)',
          border: '1px solid var(--line-pulse)',
          boxShadow: 'var(--glow-pulse), var(--shadow-pop)',
          backdropFilter: 'blur(var(--blur-sheet))',
          WebkitBackdropFilter: 'blur(var(--blur-sheet))',
        }}
      >
        <span style={{ fontSize: 14, color: 'var(--fg-1)', fontWeight: 600 }}>{label}</span>
        {status && <StatusTag status={status} size="sm" />}
        <span
          style={{
            fontSize: 13,
            color: 'var(--fg-2)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 140,
          }}
        >
          {venue}
        </span>
      </div>
    </div>
  );
}
