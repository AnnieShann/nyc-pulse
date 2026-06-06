import { type CSSProperties, type ReactNode } from 'react';
import { Check, Flame } from 'lucide-react';
import type { Report } from '../module_bindings/types';
import {
  STATUS_META,
  NO_DATA_COLOR,
  NO_DATA_TINT,
  HOT_WINDOW_MS,
  formatCount,
  heatColor,
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

/* Wordmark — Inter Black, "NYC" off-white + "Pulse" glowing cyan. */
export function Wordmark({ size = 18 }: { size?: number }) {
  return (
    <span
      style={{
        fontWeight: 800,
        fontSize: size,
        letterSpacing: '-0.02em',
        color: 'var(--fg-1)',
        lineHeight: 1.05,
      }}
    >
      NYC{' '}
      <span style={{ color: 'var(--pulse)', textShadow: '0 0 12px var(--pulse-glow)' }}>Pulse</span>
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
        background: 'var(--pulse)',
        boxShadow: disabled ? 'none' : 'var(--glow-pulse)',
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

/* Segmented switch — Hot Now / Live. */
export function Segmented({
  value,
  onChange,
}: {
  value: 'hot' | 'feed';
  onChange: (v: 'hot' | 'feed') => void;
}) {
  const opts: Array<{ k: 'hot' | 'feed'; label: string }> = [
    { k: 'hot', label: 'Hot Now' },
    { k: 'feed', label: 'Live' },
  ];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 4,
        padding: 4,
        background: 'var(--ink-800)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--line-1)',
      }}
    >
      {opts.map(o => {
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
              background: on ? 'var(--pulse)' : 'transparent',
              boxShadow: on ? 'var(--glow-pulse)' : 'none',
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
  heat,
  onClick,
}: {
  rank: number;
  venue: string;
  meta: string;
  status: Status;
  heat: number;
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
      <HeatBadge score={heat} />
      <StatusTag status={status} size="sm" />
    </button>
  );
}

/* HeatBadge — compact flame + 0–100 score, colored by heat. */
export function HeatBadge({ score }: { score: number }) {
  const c = heatColor(score);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        flexShrink: 0,
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        fontWeight: 600,
        color: c,
      }}
      title={`Heat ${score}/100`}
    >
      <Flame size={13} color={c} fill={score >= 66 ? c : 'none'} strokeWidth={2} />
      {score}
    </span>
  );
}

/* HeatMeter — the spot's heat as a number + a saturating amber→red bar. */
export function HeatMeter({ score }: { score: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--fg-3)',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Flame size={12} color={heatColor(score)} fill={score >= 66 ? heatColor(score) : 'none'} strokeWidth={2} />
          Heat
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: heatColor(score) }}>
          {score}
          <span style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 500 }}> / 100</span>
        </span>
      </div>
      <div
        style={{
          height: 6,
          borderRadius: 999,
          background: 'var(--ink-600)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.max(score, 2)}%`,
            borderRadius: 999,
            background: 'linear-gradient(90deg, #ffa52c, #ff4d4f)',
            boxShadow: score >= 50 ? '0 0 10px rgba(255,77,79,0.45)' : 'none',
            transition: 'width var(--dur-base) var(--ease-out)',
          }}
        />
      </div>
    </div>
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
        background: on ? 'rgba(45,230,200,0.12)' : 'var(--ink-600)',
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

/* Toast — "Vibe dropped." confirmation. */
export function Toast({
  show,
  status,
  venue,
}: {
  show: boolean;
  status: Status | null;
  venue: string | null;
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
        <span style={{ fontSize: 14, color: 'var(--fg-1)', fontWeight: 600 }}>Saved.</span>
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
