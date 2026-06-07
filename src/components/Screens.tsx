import { useState, type CSSProperties } from 'react';
import {
  ArrowUp,
  Bookmark,
  Check,
  ChevronLeft,
  Loader2,
  Map as MapIcon,
  Plus,
  Search,
  Settings,
  User,
  X,
} from 'lucide-react';
import { atHandle, formatAge, NO_DATA_COLOR, STATUS_META, type Status } from '../pulse';

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

export type CurrentTrip = { name: string; stops: { id: bigint; name: string }[] };
export type PastTrip = { id: string; name: string; stopCount: number; dateLabel: string };
export type WishlistVM = { id: bigint; name: string; color: string; count: number };

export function ItineraryScreen({
  currentTrip,
  wishlists,
  pastTrips,
  onOpenWishlist,
  onRemoveStop,
}: {
  currentTrip: CurrentTrip | null;
  wishlists: WishlistVM[];
  pastTrips: PastTrip[];
  onOpenWishlist: (id: bigint) => void;
  onRemoveStop: (stopId: bigint) => void;
}) {
  return (
    <div
      className="h-full w-full overflow-y-auto"
      style={{ background: 'var(--ink-900)', padding: '28px 20px 96px' }}
    >
      <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>
        My Trips
      </h1>

      {/* CURRENT ITINERARY */}
      <div style={{ marginTop: 22 }}>
        <span style={eyebrow}>Current itinerary</span>
        {currentTrip ? (
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
            <div className="flex items-center" style={{ gap: 8 }}>
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
                  padding: '3px 10px',
                }}
              >
                <span className="breathe" style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--pulse)' }} />
                Today
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--fg-2)' }}>
                {currentTrip.stops.length} {currentTrip.stops.length === 1 ? 'stop' : 'stops'}
              </span>
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--fg-1)', marginTop: 10 }}>
              {currentTrip.name}
            </div>

            {currentTrip.stops.length === 0 ? (
              <p style={{ margin: '12px 0 0', fontSize: 14, color: 'var(--fg-2)' }}>
                No stops yet — add spots from the map.
              </p>
            ) : (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column' }}>
                {currentTrip.stops.map((s, i) => (
                  <div
                    key={s.id.toString()}
                    className="flex items-center"
                    style={{
                      gap: 12,
                      padding: '11px 0',
                      borderTop: i === 0 ? 'none' : '1px solid var(--line-1)',
                    }}
                  >
                    <span
                      className="grid place-items-center shrink-0"
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        background: 'var(--ink-600)',
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--fg-1)',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 15,
                        fontWeight: 600,
                        color: 'var(--fg-1)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {s.name}
                    </span>
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
                ))}
              </div>
            )}
          </div>
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
        <span style={eyebrow}>My wishlists</span>
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
                border: 'none',
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
        {pastTrips.length === 0 ? (
          <p style={{ marginTop: 10, fontSize: 14, color: 'var(--fg-3)' }}>No past trips yet.</p>
        ) : (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pastTrips.map(t => (
              <div
                key={t.id}
                style={{
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--ink-700)',
                  border: '1px solid var(--line-1)',
                  boxShadow: 'var(--shadow-card)',
                  padding: '14px 16px',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)' }}>{t.name}</div>
                <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 2 }}>
                  {t.dateLabel} · {t.stopCount} {t.stopCount === 1 ? 'stop' : 'stops'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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

export type ActivityItem = { id: string; spotName: string; note: string; ageMs: number; status: Status };

/* Profile tab — minimal: avatar, handle, neighborhood, Following/Followers (no Posts). */
export function ProfileScreen({
  handle,
  avatar,
  neighborhood,
  activity,
  onEdit,
}: {
  handle: string;
  avatar: string;
  neighborhood: string;
  activity: ActivityItem[];
  onEdit: () => void;
}) {
  return (
    <div
      className="h-full w-full overflow-y-auto"
      style={{ background: 'var(--ink-900)', padding: '28px 20px 96px' }}
    >
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
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg-1)' }}>0</span>
          <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>Following</span>
        </div>
        <div style={{ width: 1, background: 'var(--line-1)' }} />
        <div style={{ ...statCol, flex: 1 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--fg-1)' }}>0</span>
          <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>Followers</span>
        </div>
      </div>

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
                  background: 'var(--ink-700)',
                  border: '1px solid var(--line-1)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-card)',
                  padding: '12px 14px',
                }}
              >
                <div className="flex items-center" style={{ gap: 8 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: STATUS_META[a.status].color,
                      background: STATUS_META[a.status].tint,
                      borderRadius: 'var(--radius-pill)',
                      padding: '2px 9px',
                    }}
                  >
                    {a.spotName}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>Left a vibe</span>
                </div>
                {a.note && (
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
    </div>
  );
}
