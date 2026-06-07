import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ArrowUp,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Copy,
  GripVertical,
  Loader2,
  Map as MapIcon,
  MessageSquare,
  Minus,
  Plus,
  Search,
  Settings,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { atHandle, formatAge, NO_DATA_COLOR, STATUS_META, type Status } from '../pulse';
import { PAST_ITINERARIES, MEMBERS, type Member, type PastItinerary } from '../lib/demoTrips';
import { Wordmark } from './pulse-ui';

/* Overlapping circle avatars for trip members. */
function AvatarStack({ ids, size = 28 }: { ids: string[]; size?: number }) {
  return (
    <div style={{ display: 'flex' }}>
      {ids.map((id, i) => {
        const m = MEMBERS[id];
        if (!m) return null;
        return (
          <span
            key={id}
            title={m.name}
            style={{
              width: size,
              height: size,
              borderRadius: 999,
              background: m.color,
              color: '#3c3c44',
              display: 'grid',
              placeItems: 'center',
              fontSize: Math.round(size * 0.38),
              fontWeight: 700,
              border: '2px solid #fff',
              marginLeft: i === 0 ? 0 : -Math.round(size * 0.34),
              flexShrink: 0,
            }}
          >
            {m.initials}
          </span>
        );
      })}
    </div>
  );
}

export type Tab = 'explore' | 'itinerary' | 'profile';

/* Bottom tab bar (Explore / Itinerary / Profile). */
export function NavBar({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  const items: Array<{ k: Tab; label: string; Icon: typeof MapIcon }> = [
    { k: 'explore', label: 'Explore', Icon: MapIcon },
    { k: 'itinerary', label: 'Itinerary', Icon: Bookmark },
    { k: 'profile', label: 'Profile', Icon: User },
  ];
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-[1600] flex items-center justify-around"
      style={{
        height: 'calc(64px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(255,255,255,0.92)',
        borderTop: '1px solid var(--line-1)',
        backdropFilter: 'blur(var(--blur-control))',
        WebkitBackdropFilter: 'blur(var(--blur-control))',
      }}
    >
      {items.map(({ k, label, Icon }) => {
        const on = value === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className="press"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: on ? 'var(--fg-1)' : 'var(--fg-3)',
              padding: '6px 18px',
            }}
          >
            <Icon size={22} strokeWidth={on ? 2.4 : 2} />
            <span style={{ fontSize: 11, fontWeight: on ? 700 : 500 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* Tourist / Local pill toggle (visual for now). */
export function TouristToggle({
  value,
  onChange,
}: {
  value: 'tourist' | 'local';
  onChange: (v: 'tourist' | 'local') => void;
}) {
  return (
    <div
      className="pointer-events-auto"
      style={{
        display: 'inline-flex',
        padding: 4,
        borderRadius: 'var(--radius-pill)',
        background: 'var(--glass-surface)',
        border: '1px solid var(--line-2)',
        backdropFilter: 'blur(var(--blur-control))',
        WebkitBackdropFilter: 'blur(var(--blur-control))',
      }}
    >
      {(['tourist', 'local'] as const).map(k => {
        const on = value === k;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className="press"
            style={{
              height: 32,
              padding: '0 16px',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'capitalize',
              color: on ? 'var(--fg-on-accent)' : 'var(--fg-2)',
              background: on ? 'var(--accent-ink)' : 'transparent',
            }}
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}

/* A recommendation card (view model built in App). */
export type RecCard = {
  id: bigint;
  name: string;
  category: string;
  priceLabel: string;
  busyness: number | null;
  busynessLabel: string | null;
  color: string;
  distance: string;
  waitMinutes: number | null;
  thumb: string | null;
};

function pillBtn(active: boolean): CSSProperties {
  return {
    flex: 1,
    height: 36,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 'var(--radius-md)',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    border: '1px solid var(--line-2)',
    background: active ? 'var(--pulse-tint)' : 'var(--ink-700)',
    color: active ? 'var(--pulse)' : 'var(--fg-1)',
  };
}

function RecCardView({
  c,
  saved,
  added,
  onPick,
  onAddTrip,
  onSave,
}: {
  c: RecCard;
  saved: boolean;
  added: boolean;
  onPick: () => void;
  onAddTrip: () => void;
  onSave: () => void;
}) {
  return (
    <div
      style={{
        scrollSnapAlign: 'start',
        flex: '0 0 244px',
        background: 'var(--ink-700)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--line-1)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <button
        type="button"
        onClick={onPick}
        style={{
          position: 'relative',
          height: 104,
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          background: c.thumb
            ? '#000'
            : 'linear-gradient(135deg, var(--ink-500), var(--ink-600))',
        }}
      >
        {c.thumb && (
          <img src={c.thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <span
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 8px',
            borderRadius: 'var(--radius-pill)',
            background: 'rgba(255,255,255,0.92)',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 999, background: c.color }} />
          <span style={{ color: c.busyness != null ? c.color : NO_DATA_COLOR }}>
            {c.busyness != null ? `${c.busyness}` : '—'}
          </span>
          {c.busynessLabel && <span style={{ color: 'var(--fg-2)' }}>{c.busynessLabel}</span>}
        </span>
      </button>

      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          type="button"
          onClick={onPick}
          style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--fg-1)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {c.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-2)', textTransform: 'capitalize' }}>
            {c.category}
            {c.priceLabel ? ` · ${c.priceLabel}` : ''} · {c.distance}
            {c.waitMinutes != null ? ` · ~${c.waitMinutes}m wait` : ''}
          </div>
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={pillBtn(added)} onClick={onAddTrip}>
            {added ? <Check size={14} /> : <Plus size={14} />}
            {added ? 'Added' : 'Add to trip'}
          </button>
          <button
            type="button"
            style={pillBtn(saved)}
            onClick={onSave}
            aria-label={saved ? 'Saved' : 'Save spot'}
          >
            <Bookmark size={14} fill={saved ? 'var(--pulse)' : 'none'} />
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Bottom chatbox — type a request, get a swipeable carousel of recommended spots. */
export function ChatPanel({
  loading,
  recs,
  savedIds,
  tripIds,
  onSubmit,
  onClear,
  onPick,
  onAddTrip,
  onSave,
}: {
  loading: boolean;
  recs: RecCard[];
  savedIds: Set<bigint>;
  tripIds: Set<bigint>;
  onSubmit: (q: string) => void;
  onClear: () => void;
  onPick: (id: bigint) => void;
  onAddTrip: (id: bigint) => void;
  onSave: (id: bigint) => void;
}) {
  const [text, setText] = useState('');
  const submit = () => {
    const q = text.trim();
    if (q && !loading) onSubmit(q);
  };
  return (
    <div
      className="absolute inset-x-0 z-[1500] px-3"
      style={{ bottom: 'calc(64px + env(safe-area-inset-bottom) + 10px)' }}
    >
      {recs.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div className="flex items-center justify-between" style={{ padding: '0 4px 6px' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-1)' }}>Top picks</span>
            <button
              type="button"
              onClick={onClear}
              className="press"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'var(--glass-raised)',
                border: '1px solid var(--line-2)',
                borderRadius: 'var(--radius-pill)',
                padding: '3px 10px',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--fg-2)',
                cursor: 'pointer',
                backdropFilter: 'blur(var(--blur-control))',
              }}
            >
              Clear <X size={12} />
            </button>
          </div>
          <div
            className="no-scrollbar"
            style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              paddingBottom: 4,
            }}
          >
            {recs.map(c => (
              <RecCardView
                key={c.id.toString()}
                c={c}
                saved={savedIds.has(c.id)}
                added={tripIds.has(c.id)}
                onPick={() => onPick(c.id)}
                onAddTrip={() => onAddTrip(c.id)}
                onSave={() => onSave(c.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '0 4px 6px' }}>
        <Wordmark size={20} />
      </div>
      <div
        style={{
          borderRadius: 'var(--radius-xl)',
          background: 'var(--glass-surface)',
          border: '1px solid var(--line-1)',
          boxShadow: 'var(--shadow-pop)',
          backdropFilter: 'blur(var(--blur-sheet))',
          WebkitBackdropFilter: 'blur(var(--blur-sheet))',
          padding: 14,
        }}
      >
        <div style={{ fontSize: 14, color: 'var(--fg-2)', marginBottom: 8 }}>
          What would you like to do today?
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 44,
            padding: '0 6px 0 14px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--ink-600)',
            border: '1px solid var(--line-1)',
          }}
        >
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="A cozy evening with live jazz nearby…"
            style={{
              flex: 1,
              minWidth: 0,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 14,
              color: 'var(--fg-1)',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <button
            type="button"
            onClick={submit}
            disabled={loading || !text.trim()}
            aria-label="Send"
            className="grid place-items-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              flexShrink: 0,
              border: 'none',
              cursor: loading || !text.trim() ? 'default' : 'pointer',
              background: text.trim() && !loading ? 'var(--accent-ink)' : 'var(--ink-400)',
              color: '#fff',
            }}
          >
            {loading ? <Loader2 size={16} className="spin" /> : <ArrowUp size={16} strokeWidth={2.4} />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Itinerary tab — placeholder (built in a later step). */
const eyebrow: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--fg-3)',
};

export type TripMember = { initials: string; color: string; avatar?: string };
export type CurrentTrip = {
  name: string;
  dateLabel: string;
  members: TripMember[];
  stops: { id: bigint; spotId: bigint; name: string }[];
};
export type WishlistVM = { id: bigint; name: string; color: string; count: number };

const TRIP_STEP_MIN = 90; // gap between stops
// minutes-since-midnight -> "7:00pm" / "HH:MM" (24h, for <input type=time>)
function fmt12(mins: number): string {
  const t = ((mins % 1440) + 1440) % 1440;
  const h24 = Math.floor(t / 60);
  const m = t % 60;
  const ampm = h24 < 12 ? 'am' : 'pm';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, '0')}${ampm}`;
}
function to24(mins: number): string {
  const t = ((mins % 1440) + 1440) % 1440;
  return `${Math.floor(t / 60).toString().padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`;
}

export type SharePerson = { id: string; name: string; handle: string; initials: string; color: string };

/* The rich current-trip card: Live + date, members (+ share), stop count, a
   progress stepper (lights up to the checked-in stop), editable times, and a
   reorderable / deletable stop list. Only renders when a real trip exists. */
function CurrentTripCard({
  trip,
  activeIndex,
  people,
  sharedIds,
  onToggleShare,
  onRemoveStop,
  onReorder,
  onOpenStop,
  onArchive,
}: {
  trip: CurrentTrip;
  activeIndex: number;
  people: SharePerson[];
  sharedIds: Set<string>;
  onToggleShare: (id: string) => void;
  onRemoveStop: (id: bigint) => void;
  onReorder: (orderedIds: bigint[]) => void;
  onOpenStop: (spotId: bigint) => void;
  onArchive: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [shareQuery, setShareQuery] = useState('');
  const ROW_H = 56; // fixed row height enables smooth transform-based reordering
  const [order, setOrder] = useState(trip.stops);
  const sig = trip.stops.map(s => s.id.toString()).join(',');
  useEffect(() => {
    setOrder(trip.stops);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  // Per-slot visit times (default 7:00pm + 90m each). Editing one slot shifts it
  // and every slot AHEAD of it by the same delta; earlier slots stay put.
  const defaultTimes = (n: number) =>
    Array.from({ length: n }, (_, i) => 19 * 60 + i * TRIP_STEP_MIN);
  const [times, setTimes] = useState<number[]>(() => defaultTimes(trip.stops.length));
  const len = trip.stops.length;
  useEffect(() => {
    setTimes(prev => (prev.length === len ? prev : defaultTimes(len)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [len]);
  const timeAt = (slot: number) => times[slot] ?? 19 * 60 + slot * TRIP_STEP_MIN;
  const setTimeAt = (slot: number, mins: number) => {
    setTimes(prev => {
      const base = prev.length === len ? prev : defaultTimes(len);
      const delta = mins - (base[slot] ?? 19 * 60 + slot * TRIP_STEP_MIN);
      return base.map((t, j) => (j >= slot ? t + delta : t));
    });
  };

  const drag = useRef<{ id: bigint; startY: number; startSlot: number } | null>(null);
  const [dragId, setDragId] = useState<bigint | null>(null);
  const [dy, setDy] = useState(0);

  const onDown = (id: bigint) => (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { id, startY: e.clientY, startSlot: order.findIndex(s => s.id === id) };
    setDragId(id);
    setDy(0);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const delta = e.clientY - d.startY;
    setDy(delta);
    const targetSlot = Math.max(0, Math.min(order.length - 1, d.startSlot + Math.round(delta / ROW_H)));
    const cur = order.findIndex(s => s.id === d.id);
    if (cur !== -1 && cur !== targetSlot) {
      const next = [...order];
      const [item] = next.splice(cur, 1);
      next.splice(targetSlot, 0, item);
      setOrder(next);
    }
  };
  const onUp = () => {
    if (!drag.current) return;
    drag.current = null;
    setDragId(null);
    setDy(0);
    onReorder(order.map(s => s.id));
  };

  return (
    <div
      style={{
        marginTop: 10,
        borderRadius: 'var(--radius-xl)',
        background: 'var(--ink-700)',
        border: '1.5px solid var(--pulse)',
        boxShadow: 'var(--shadow-card)',
        padding: 16,
      }}
    >
      {/* title + collapse */}
      <div className="flex items-start" style={{ gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--fg-1)', letterSpacing: '-0.01em' }}>
            {trip.name}
          </div>
          <div className="flex items-center" style={{ gap: 8, marginTop: 6 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                background: 'var(--pulse-tint)',
                color: 'var(--pulse)',
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 'var(--radius-pill)',
                padding: '3px 9px',
              }}
            >
              <span className="breathe" style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pulse)' }} />
              Live
            </span>
            <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>{trip.dateLabel}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center" style={{ gap: 8 }}>
          <button
            type="button"
            onClick={onArchive}
            className="press"
            style={{
              height: 32,
              padding: '0 12px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--ink-600)',
              border: '1px solid var(--line-2)',
              color: 'var(--fg-1)',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Save to past
          </button>
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            className="press grid place-items-center"
            style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--ink-600)', border: '1px solid var(--line-1)', color: 'var(--fg-2)' }}
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* members + stop count */}
      <div className="flex items-center" style={{ gap: 8, marginTop: 12 }}>
        <div style={{ display: 'flex' }}>
          {trip.members.map((m, i) => (
            <span
              key={i}
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                background: m.avatar ? '#000' : m.color,
                color: '#3c3c44',
                display: 'grid',
                placeItems: 'center',
                fontSize: 12,
                fontWeight: 700,
                overflow: 'hidden',
                border: '2px solid var(--ink-700)',
                marginLeft: i === 0 ? 0 : -10,
              }}
            >
              {m.avatar ? (
                <img src={m.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                m.initials
              )}
            </span>
          ))}
        </div>

        {/* share itinerary with other users */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowShare(v => !v)}
            aria-label="Share itinerary"
            title="Share with friends"
            className="press grid place-items-center"
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              marginLeft: 4,
              background: 'var(--ink-600)',
              border: '1px dashed var(--line-2)',
              color: 'var(--fg-2)',
              cursor: 'pointer',
            }}
          >
            <UserPlus size={15} />
          </button>
          {showShare && (
            <>
              <div onClick={() => setShowShare(false)} style={{ position: 'fixed', inset: 0, zIndex: 2400 }} />
              <div
                style={{
                  position: 'absolute',
                  top: 38,
                  left: 0,
                  zIndex: 2500,
                  width: 260,
                  background: 'var(--ink-700)',
                  border: '1px solid var(--line-2)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-pop)',
                  padding: 8,
                }}
              >
                <div
                  className="flex items-center"
                  style={{
                    gap: 8,
                    height: 38,
                    padding: '0 10px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--ink-600)',
                    border: '1px solid var(--line-1)',
                    marginBottom: 6,
                  }}
                >
                  <Search size={14} color="var(--fg-3)" />
                  <input
                    value={shareQuery}
                    onChange={e => setShareQuery(e.target.value)}
                    placeholder="Search people…"
                    autoFocus
                    style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--fg-1)' }}
                  />
                </div>
                <div style={{ maxHeight: 220, overflowY: 'auto' }} className="no-scrollbar">
                  {people
                    .filter(
                      pp =>
                        !shareQuery.trim() ||
                        pp.name.toLowerCase().includes(shareQuery.toLowerCase()) ||
                        pp.handle.toLowerCase().includes(shareQuery.toLowerCase())
                    )
                    .map(pp => {
                      const on = sharedIds.has(pp.id);
                      return (
                        <button
                          key={pp.id}
                          type="button"
                          onClick={() => onToggleShare(pp.id)}
                          className="press flex items-center"
                          style={{
                            width: '100%',
                            gap: 10,
                            padding: '8px',
                            borderRadius: 'var(--radius-md)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <span
                            className="grid place-items-center shrink-0"
                            style={{ width: 32, height: 32, borderRadius: 999, background: pp.color, color: '#3c3c44', fontSize: 12, fontWeight: 700 }}
                          >
                            {pp.initials}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>{pp.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{atHandle(pp.handle)}</div>
                          </div>
                          <span style={{ color: on ? 'var(--pulse)' : 'var(--fg-3)', flexShrink: 0 }}>
                            {on ? <Check size={18} /> : <Plus size={18} />}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </div>

        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--fg-2)' }}>
          {order.length} {order.length === 1 ? 'stop' : 'stops'}
        </span>
      </div>

      {expanded && order.length > 0 && (
        <>
          {/* progress stepper */}
          <div className="flex items-center" style={{ marginTop: 14 }}>
            {order.map((s, i) => {
              const done = i < activeIndex;
              const current = i === activeIndex;
              const dot = current
                ? 'var(--pulse)'
                : done
                  ? 'var(--pulse-tint)'
                  : 'var(--ink-600)';
              const txt = current ? '#fff' : done ? 'var(--pulse)' : 'var(--fg-3)';
              return (
                <div key={s.id.toString()} className="flex items-center" style={{ flex: i === order.length - 1 ? '0 0 auto' : 1 }}>
                  <span
                    className="grid place-items-center shrink-0"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      background: dot,
                      color: txt,
                      fontSize: 13,
                      fontWeight: 700,
                      boxShadow: current ? 'var(--glow-pulse)' : 'none',
                    }}
                  >
                    {i + 1}
                  </span>
                  {i < order.length - 1 && (
                    <span
                      style={{
                        flex: 1,
                        height: 2,
                        margin: '0 4px',
                        background: i < activeIndex ? 'var(--pulse)' : 'var(--line-2)',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ height: 1, background: 'var(--line-1)', margin: '14px 0 6px' }} />

          {/* reorderable (smooth drag) / deletable stop list */}
          <div style={{ position: 'relative', height: order.length * ROW_H }}>
            {order.map((s, slot) => {
              const dragging = dragId === s.id;
              const translate = dragging ? drag.current!.startSlot * ROW_H + dy : slot * ROW_H;
              return (
                <div
                  key={s.id.toString()}
                  className="flex items-center"
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    height: ROW_H,
                    gap: 10,
                    padding: '0 2px',
                    transform: `translateY(${translate}px)`,
                    transition: dragging ? 'none' : 'transform 180ms var(--ease-out)',
                    zIndex: dragging ? 5 : 1,
                    background: dragging ? 'var(--ink-700)' : 'transparent',
                    borderRadius: dragging ? 'var(--radius-md)' : 0,
                    boxShadow: dragging ? 'var(--shadow-pop)' : 'none',
                    touchAction: 'none',
                  }}
                >
                  <span
                    onPointerDown={onDown(s.id)}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                    onPointerCancel={onUp}
                    className="grid place-items-center shrink-0"
                    style={{ width: 24, height: ROW_H, color: 'var(--fg-3)', cursor: 'grab', touchAction: 'none' }}
                    aria-label="Drag to reorder"
                  >
                    <GripVertical size={16} />
                  </span>
                  <span
                    className="grid place-items-center shrink-0"
                    style={{ width: 26, height: 26, borderRadius: 999, background: 'var(--ink-600)', fontSize: 13, fontWeight: 700, color: 'var(--fg-1)' }}
                  >
                    {slot + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenStop(s.spotId)}
                    onPointerDown={e => e.stopPropagation()}
                    title="View details"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--fg-1)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {s.name}
                  </button>
                  <input
                    type="time"
                    value={to24(timeAt(slot))}
                    onChange={e => {
                      const [h, m] = e.target.value.split(':').map(Number);
                      if (!Number.isNaN(h) && !Number.isNaN(m)) setTimeAt(slot, h * 60 + m);
                    }}
                    onPointerDown={e => e.stopPropagation()}
                    title={fmt12(timeAt(slot))}
                    aria-label="Visit time"
                    style={{
                      flexShrink: 0,
                      width: 96,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 13,
                      color: 'var(--fg-2)',
                      cursor: 'pointer',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveStop(s.id)}
                    aria-label="Remove stop"
                    className="press grid place-items-center shrink-0"
                    style={{ width: 28, height: 28, borderRadius: 999, background: 'none', border: 'none', color: 'var(--fg-3)', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function ItineraryScreen({
  currentTrip,
  wishlists,
  activeStopIndex,
  people,
  sharedMemberIds,
  onToggleShareMember,
  onOpenWishlist,
  onCreateWishlist,
  onOpenPast,
  onRemoveStop,
  onReorderStops,
  onOpenStop,
  onArchive,
  extraPast,
}: {
  currentTrip: CurrentTrip | null;
  wishlists: WishlistVM[];
  activeStopIndex: number;
  people: SharePerson[];
  sharedMemberIds: Set<string>;
  onToggleShareMember: (id: string) => void;
  onOpenWishlist: (id: bigint) => void;
  onCreateWishlist: (name: string) => void;
  onOpenPast: (id: string) => void;
  onRemoveStop: (stopId: bigint) => void;
  onReorderStops: (orderedIds: bigint[]) => void;
  onOpenStop: (spotId: bigint) => void;
  onArchive: () => void;
  extraPast: PastItinerary[];
}) {
  const [showNewWishlist, setShowNewWishlist] = useState(false);
  const [newName, setNewName] = useState('');
  const submitNew = () => {
    const n = newName.trim();
    if (!n) return;
    onCreateWishlist(n);
    setNewName('');
    setShowNewWishlist(false);
  };
  return (
    <div
      className="h-full w-full overflow-y-auto"
      style={{ background: 'var(--ink-900)', padding: '28px 20px 96px' }}
    >
      <div style={{ marginBottom: 6 }}>
        <Wordmark size={20} />
      </div>
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>
        My Trips
      </h1>

      {/* CURRENT ITINERARY */}
      <div style={{ marginTop: 22 }}>
        <span style={eyebrow}>Current itinerary</span>
        {currentTrip ? (
          <CurrentTripCard
            trip={currentTrip}
            activeIndex={activeStopIndex}
            people={people}
            sharedIds={sharedMemberIds}
            onToggleShare={onToggleShareMember}
            onRemoveStop={onRemoveStop}
            onReorder={onReorderStops}
            onOpenStop={onOpenStop}
            onArchive={onArchive}
          />
        ) : (
          <div
            style={{
              marginTop: 10,
              borderRadius: 'var(--radius-xl)',
              background: 'var(--ink-700)',
              border: '1px dashed var(--line-2)',
              boxShadow: 'var(--shadow-card)',
              padding: '28px 20px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)' }}>No itinerary for today</div>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--fg-2)', lineHeight: 1.5 }}>
              Add spots from the map or a recommendation card to start a trip.
            </p>
          </div>
        )}
      </div>

      {/* MY WISHLISTS */}
      <div style={{ marginTop: 26 }}>
        <div className="flex items-center justify-between">
          <span style={eyebrow}>My wishlists</span>
          <button
            type="button"
            onClick={() => setShowNewWishlist(true)}
            aria-label="New wishlist"
            title="New wishlist"
            className="press grid place-items-center"
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              background: 'var(--ink-700)',
              border: '1px solid var(--line-2)',
              color: 'var(--fg-1)',
              cursor: 'pointer',
            }}
          >
            <Plus size={17} strokeWidth={2.4} />
          </button>
        </div>
        <div
          className="no-scrollbar"
          style={{ marginTop: 12, display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}
        >
          {wishlists.map(w => (
            <button
              key={w.id.toString()}
              type="button"
              onClick={() => onOpenWishlist(w.id)}
              className="press"
              style={{
                flex: '0 0 116px',
                height: 116,
                borderRadius: 999,
                border: '2px solid rgba(20,22,28,0.12)',
                cursor: 'pointer',
                background: w.color,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: 12,
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#3a2b27',
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                {w.name}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(58,43,39,0.6)' }}>
                {w.count} {w.count === 1 ? 'place' : 'places'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* PAST ITINERARIES */}
      <div style={{ marginTop: 26 }}>
        <span style={eyebrow}>Past itineraries</span>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[...extraPast, ...PAST_ITINERARIES].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => onOpenPast(t.id)}
              className="press flex items-center"
              style={{
                gap: 12,
                textAlign: 'left',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--ink-700)',
                border: '1px solid var(--line-1)',
                boxShadow: 'var(--shadow-card)',
                padding: '14px 16px',
                cursor: 'pointer',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)' }}>{t.name}</div>
                <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 2 }}>
                  {t.date} · {t.stops.length} stops
                </div>
              </div>
              <AvatarStack ids={t.members} />
            </button>
          ))}
        </div>
      </div>

      {showNewWishlist && (
        <div
          onClick={() => setShowNewWishlist(false)}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2600,
            background: 'var(--glass-scrim)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 340,
              background: 'var(--ink-700)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--line-2)',
              boxShadow: 'var(--shadow-pop)',
              padding: 20,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--fg-1)', marginBottom: 14 }}>
              New wishlist
            </div>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submitNew();
              }}
              placeholder="e.g. Rooftop Bars"
              autoFocus
              maxLength={40}
              style={{
                width: '100%',
                height: 46,
                padding: '0 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--ink-600)',
                border: '1px solid var(--line-1)',
                color: 'var(--fg-1)',
                fontSize: 15,
                outline: 'none',
                marginBottom: 14,
              }}
            />
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                className="press"
                onClick={() => {
                  setNewName('');
                  setShowNewWishlist(false);
                }}
                style={{ ...profileActionBtn, height: 46 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="press"
                onClick={submitNew}
                disabled={!newName.trim()}
                style={{
                  height: 46,
                  borderRadius: 'var(--radius-lg)',
                  border: 'none',
                  background: newName.trim() ? 'var(--accent-ink)' : 'var(--ink-400)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: newName.trim() ? 'pointer' : 'default',
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* A past itinerary's detail — the route (places, times, walks) + who you shared it with. */
export function PastItineraryDetail({
  itinerary,
  onOpenMember,
  onBack,
}: {
  itinerary: PastItinerary;
  onOpenMember: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <div
      className="h-full w-full overflow-y-auto"
      style={{ background: 'var(--ink-900)', padding: '28px 20px 96px' }}
    >
      <button
        type="button"
        onClick={onBack}
        className="press flex items-center"
        style={{ gap: 4, background: 'none', border: 'none', color: 'var(--fg-2)', cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: 0 }}
      >
        <ChevronLeft size={18} /> Trips
      </button>

      <h1 style={{ margin: '14px 0 0', fontSize: 26, fontWeight: 800, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>
        {itinerary.name}
      </h1>
      <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4 }}>
        {itinerary.date} · {itinerary.stops.length} stops
      </div>

      {/* route */}
      <div
        style={{
          marginTop: 16,
          borderRadius: 'var(--radius-xl)',
          background: 'var(--ink-700)',
          border: '1px solid var(--line-1)',
          boxShadow: 'var(--shadow-card)',
          padding: '8px 16px',
        }}
      >
        {itinerary.stops.map((s, i) => (
          <div
            key={i}
            className="flex items-center"
            style={{ gap: 12, padding: '12px 0', borderTop: i === 0 ? 'none' : '1px solid var(--line-1)' }}
          >
            <span
              className="grid place-items-center shrink-0"
              style={{ width: 26, height: 26, borderRadius: 999, background: 'var(--ink-600)', fontSize: 13, fontWeight: 700, color: 'var(--fg-1)' }}
            >
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-1)' }}>{s.name}</div>
              <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 1 }}>{s.walk}</div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-2)', flexShrink: 0 }}>
              {s.time}
            </span>
          </div>
        ))}
      </div>

      {/* shared with */}
      {itinerary.members.length > 0 && (
      <div style={{ marginTop: 22 }}>
        <span style={eyebrow}>Shared with</span>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {itinerary.members.map(id => {
            const m = MEMBERS[id];
            if (!m) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onOpenMember(id)}
                className="press flex items-center"
                style={{
                  gap: 12,
                  textAlign: 'left',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--ink-700)',
                  border: '1px solid var(--line-1)',
                  boxShadow: 'var(--shadow-card)',
                  padding: '10px 14px',
                  cursor: 'pointer',
                }}
              >
                <span
                  className="grid place-items-center shrink-0"
                  style={{ width: 40, height: 40, borderRadius: 999, background: m.color, color: '#3c3c44', fontSize: 15, fontWeight: 700 }}
                >
                  {m.initials}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)' }}>{m.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>{atHandle(m.handle)}</div>
                </div>
                <ChevronLeft size={18} color="var(--fg-3)" style={{ transform: 'rotate(180deg)' }} />
              </button>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}

/* A collaborator's (read-only) profile — the multiplayer touch. */
export function MemberProfile({
  member,
  isFollowing,
  onToggleFollow,
  onBack,
}: {
  member: Member;
  isFollowing: boolean;
  onToggleFollow: () => void;
  onBack: () => void;
}) {
  return (
    <div
      className="h-full w-full overflow-y-auto"
      style={{ background: 'var(--ink-900)', padding: '28px 20px 96px' }}
    >
      <button
        type="button"
        onClick={onBack}
        className="press flex items-center"
        style={{ gap: 4, background: 'none', border: 'none', color: 'var(--fg-2)', cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: 0 }}
      >
        <ChevronLeft size={18} /> Back
      </button>

      <div className="flex flex-col items-center" style={{ gap: 8, marginTop: 18 }}>
        <span
          className="grid place-items-center"
          style={{ width: 96, height: 96, borderRadius: 999, background: member.color, color: '#3c3c44', fontSize: 34, fontWeight: 800 }}
        >
          {member.initials}
        </span>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--fg-1)' }}>{atHandle(member.handle)}</div>
        <span
          style={{ fontSize: 12, color: 'var(--fg-2)', background: 'var(--ink-600)', borderRadius: 'var(--radius-pill)', padding: '4px 12px' }}
        >
          {member.neighborhood}
        </span>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--fg-2)', textAlign: 'center', maxWidth: 320, lineHeight: 1.5 }}>
          {member.bio}
        </p>
      </div>

      <div
        className="flex"
        style={{
          marginTop: 18,
          background: 'var(--ink-700)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--line-1)',
          boxShadow: 'var(--shadow-card)',
          padding: '16px 0',
        }}
      >
        <div style={{ ...statCol, flex: 1 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg-1)' }}>{member.following}</span>
          <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>Following</span>
        </div>
        <div style={{ width: 1, background: 'var(--line-1)' }} />
        <div style={{ ...statCol, flex: 1 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg-1)' }}>
            {(member.followers + (isFollowing ? 1 : 0)).toLocaleString()}
          </span>
          <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>Followers</span>
        </div>
      </div>

      <button
        type="button"
        className="press"
        onClick={onToggleFollow}
        style={{
          marginTop: 16,
          width: '100%',
          height: 46,
          borderRadius: 'var(--radius-lg)',
          border: `1px solid ${isFollowing ? 'var(--line-2)' : 'transparent'}`,
          background: isFollowing ? 'var(--ink-700)' : 'var(--accent-ink)',
          color: isFollowing ? 'var(--fg-1)' : 'var(--fg-on-accent)',
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        {isFollowing ? (
          <>
            <Check size={16} /> Following
          </>
        ) : (
          'Follow'
        )}
      </button>
    </div>
  );
}

/* A wishlist's detail page — its spots + a picker to add more. */
export function WishlistDetail({
  name,
  color,
  items,
  spots,
  alreadyIn,
  onAdd,
  onRemove,
  onBack,
}: {
  name: string;
  color: string;
  items: { id: bigint; name: string; category: string }[];
  spots: { id: bigint; name: string; category: string }[];
  alreadyIn: Set<bigint>;
  onAdd: (spotId: bigint) => void;
  onRemove: (itemId: bigint) => void;
  onBack: () => void;
}) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const results = query
    ? spots
        .filter(s => s.name.toLowerCase().includes(query) || s.category.toLowerCase().includes(query))
        .slice(0, 8)
    : [];
  return (
    <div
      className="h-full w-full overflow-y-auto"
      style={{ background: 'var(--ink-900)', padding: '28px 20px 96px' }}
    >
      <button
        type="button"
        onClick={onBack}
        className="press flex items-center"
        style={{ gap: 4, background: 'none', border: 'none', color: 'var(--fg-2)', cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: 0 }}
      >
        <ChevronLeft size={18} /> Trips
      </button>

      <div className="flex items-center" style={{ gap: 12, marginTop: 14 }}>
        <span style={{ width: 44, height: 44, borderRadius: 999, background: color, flexShrink: 0 }} />
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>
          {name}
        </h1>
      </div>
      <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 6 }}>
        {items.length} {items.length === 1 ? 'place' : 'places'}
      </div>

      {/* add a place */}
      <div
        className="flex items-center"
        style={{
          marginTop: 16,
          gap: 8,
          height: 46,
          padding: '0 14px',
          borderRadius: 'var(--radius-pill)',
          background: 'var(--ink-700)',
          border: '1px solid var(--line-1)',
        }}
      >
        <Search size={16} color="var(--fg-3)" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Add a place…"
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--fg-1)' }}
        />
      </div>
      {results.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {results.map(s => {
            const inList = alreadyIn.has(s.id);
            return (
              <button
                key={s.id.toString()}
                type="button"
                onClick={() => {
                  if (!inList) onAdd(s.id);
                }}
                className="press flex items-center"
                style={{
                  gap: 10,
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--ink-700)',
                  border: '1px solid var(--line-1)',
                  cursor: inList ? 'default' : 'pointer',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-2)', textTransform: 'capitalize' }}>{s.category}</div>
                </div>
                <span style={{ color: inList ? 'var(--pulse)' : 'var(--fg-3)' }}>
                  {inList ? <Check size={18} /> : <Plus size={18} />}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* current items */}
      <div style={{ marginTop: 18 }}>
        {items.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--fg-3)' }}>
            No places yet — search above to add your first.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(it => (
              <div
                key={it.id.toString()}
                className="flex items-center"
                style={{
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--ink-700)',
                  border: '1px solid var(--line-1)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)' }}>{it.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-2)', textTransform: 'capitalize' }}>{it.category}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(it.id)}
                  aria-label="Remove"
                  className="press grid place-items-center shrink-0"
                  style={{ width: 30, height: 30, borderRadius: 999, background: 'var(--ink-600)', border: 'none', color: 'var(--fg-3)', cursor: 'pointer' }}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const statCol: CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 };

const profileActionBtn: CSSProperties = {
  height: 48,
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--line-2)',
  background: 'var(--ink-700)',
  color: 'var(--fg-1)',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: 'var(--shadow-card)',
};
const shareBtnDark: CSSProperties = {
  width: '100%',
  height: 48,
  borderRadius: 'var(--radius-lg)',
  border: 'none',
  background: 'var(--accent-ink)',
  color: 'var(--fg-on-accent)',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
};
const shareBtnOutline: CSSProperties = {
  width: '100%',
  height: 48,
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--line-2)',
  background: 'var(--ink-700)',
  color: 'var(--fg-1)',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
};

export type ActivityItem = {
  id: string;
  kind: 'vibe' | 'photo';
  targetId: bigint; // report id (vibe) or photo id (photo) — for deletion
  spotName: string;
  note: string;
  ageMs: number;
  status: Status;
  thumb?: string; // photo data URL (photo kind)
};

/* Profile tab — minimal: avatar, handle, neighborhood, Following/Followers (no Posts). */
export function ProfileScreen({
  handle,
  avatar,
  neighborhood,
  vibes,
  following,
  activity,
  onEdit,
  onDeleteActivity,
}: {
  handle: string;
  avatar: string;
  neighborhood: string;
  vibes: number;
  following: number;
  activity: ActivityItem[];
  onEdit: () => void;
  onDeleteActivity: (item: ActivityItem) => void;
}) {
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ActivityItem | null>(null);
  const link =
    (typeof window !== 'undefined' ? window.location.origin : 'https://nyc-pulse-two.vercel.app') +
    `/u/${handle}`;
  const copyLink = () => {
    navigator.clipboard?.writeText(link).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      },
      () => {}
    );
  };
  return (
    <div
      className="h-full w-full overflow-y-auto"
      style={{ background: 'var(--ink-900)', padding: '28px 20px 96px' }}
    >
      <div style={{ marginBottom: 6 }}>
        <Wordmark size={20} />
      </div>
      <div className="flex items-center justify-between">
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>
          Profile
        </h1>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit profile"
          className="press grid place-items-center"
          style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--ink-700)', border: '1px solid var(--line-1)', color: 'var(--fg-2)' }}
        >
          <Settings size={18} />
        </button>
      </div>

      <div className="flex flex-col items-center" style={{ gap: 8, marginTop: 18 }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 999,
            overflow: 'hidden',
            border: '3px solid var(--pulse)',
            background: avatar ? 'transparent' : 'linear-gradient(135deg, var(--pulse-dim), var(--status-dead))',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {avatar ? (
            <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <User size={40} color="#fff" />
          )}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--fg-1)' }}>{atHandle(handle)}</div>
        {neighborhood && (
          <span
            style={{
              fontSize: 12,
              color: 'var(--fg-2)',
              background: 'var(--ink-600)',
              borderRadius: 'var(--radius-pill)',
              padding: '4px 12px',
            }}
          >
            {neighborhood}
          </span>
        )}
      </div>

      {/* Following / Followers only (no Posts) */}
      <div
        className="flex"
        style={{
          marginTop: 18,
          background: 'var(--ink-700)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--line-1)',
          boxShadow: 'var(--shadow-card)',
          padding: '16px 0',
        }}
      >
        <div style={{ ...statCol, flex: 1 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg-1)' }}>{vibes}</span>
          <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>Vibes</span>
        </div>
        <div style={{ width: 1, background: 'var(--line-1)' }} />
        <div style={{ ...statCol, flex: 1 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg-1)' }}>{following}</span>
          <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>Following</span>
        </div>
        <div style={{ width: 1, background: 'var(--line-1)' }} />
        <div style={{ ...statCol, flex: 1 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg-1)' }}>0</span>
          <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>Followers</span>
        </div>
      </div>

      {/* edit / share profile */}
      <div className="grid grid-cols-2 gap-2.5" style={{ marginTop: 12 }}>
        <button type="button" className="press" onClick={onEdit} style={profileActionBtn}>
          Edit Profile
        </button>
        <button type="button" className="press" onClick={() => setShowShare(true)} style={profileActionBtn}>
          Share Profile
        </button>
      </div>

      {showShare && (
        <div
          onClick={() => setShowShare(false)}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2600,
            background: 'var(--glass-scrim)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 360,
              background: 'var(--ink-700)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--line-2)',
              boxShadow: 'var(--shadow-pop)',
              padding: 20,
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--fg-1)' }}>Share profile</span>
              <button
                type="button"
                onClick={() => setShowShare(false)}
                aria-label="Close"
                className="grid place-items-center"
                style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--ink-600)', border: 'none', color: 'var(--fg-2)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              className="flex items-center"
              style={{
                gap: 8,
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--ink-600)',
                border: '1px solid var(--line-1)',
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 13,
                  color: 'var(--fg-2)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {link}
              </span>
            </div>

            <button type="button" className="press" onClick={copyLink} style={shareBtnDark}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <a
              href={`sms:&body=${encodeURIComponent(`Check out my Dionysus profile: ${link}`)}`}
              className="press"
              style={{ ...shareBtnOutline, marginTop: 10, textDecoration: 'none' }}
            >
              <MessageSquare size={16} /> Share to Messages
            </a>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--fg-3)',
          }}
        >
          Activity
        </span>
        <div className="flex flex-col" style={{ gap: 10, marginTop: 12 }}>
          {activity.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--fg-3)', padding: '8px 2px' }}>
              No activity yet — drop a vibe on a spot.
            </p>
          ) : (
            activity.map(a => (
              <div
                key={a.id}
                style={{
                  position: 'relative',
                  background: 'var(--ink-700)',
                  border: '1px solid var(--line-1)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-card)',
                  padding: '12px 14px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setConfirmDelete(a)}
                  aria-label={a.kind === 'photo' ? 'Delete photo' : 'Delete reaction'}
                  className="press grid place-items-center"
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 24,
                    height: 24,
                    borderRadius: 999,
                    background: 'var(--ink-600)',
                    border: '1px solid var(--line-1)',
                    color: 'var(--fg-3)',
                    cursor: 'pointer',
                    zIndex: 1,
                  }}
                >
                  <Minus size={14} strokeWidth={2.6} />
                </button>
                <div className="flex items-center" style={{ gap: 8, paddingRight: 28 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: STATUS_META.packed.color,
                      background: STATUS_META.packed.tint,
                      borderRadius: 'var(--radius-pill)',
                      padding: '2px 9px',
                    }}
                  >
                    {a.spotName}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>
                    {a.kind === 'photo' ? 'Added a photo' : 'Left a vibe'}
                  </span>
                </div>
                {a.kind === 'photo' && a.thumb && (
                  <img
                    src={a.thumb}
                    alt=""
                    style={{
                      marginTop: 10,
                      width: '100%',
                      height: 150,
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-md)',
                    }}
                  />
                )}
                {a.kind === 'vibe' && a.note && (
                  <p style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--fg-1)', lineHeight: 1.4 }}>{a.note}</p>
                )}
                <span style={{ display: 'block', marginTop: 8, fontSize: 12, color: 'var(--fg-3)' }}>
                  {formatAge(a.ageMs)} ago
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {confirmDelete != null && (
        <div
          onClick={() => setConfirmDelete(null)}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2700,
            background: 'var(--glass-scrim)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 320,
              background: 'var(--ink-700)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--line-2)',
              boxShadow: 'var(--shadow-pop)',
              padding: 22,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--fg-1)' }}>
              {confirmDelete.kind === 'photo'
                ? 'Do you want to delete this photo?'
                : 'Do you want to delete this reaction?'}
            </div>
            <p style={{ margin: '8px 0 18px', fontSize: 14, color: 'var(--fg-2)' }}>
              This can't be undone.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                className="press"
                onClick={() => setConfirmDelete(null)}
                style={{ ...profileActionBtn, height: 46 }}
              >
                No
              </button>
              <button
                type="button"
                className="press"
                onClick={() => {
                  onDeleteActivity(confirmDelete);
                  setConfirmDelete(null);
                }}
                style={{
                  height: 46,
                  borderRadius: 'var(--radius-lg)',
                  border: 'none',
                  background: 'var(--status-packed)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
