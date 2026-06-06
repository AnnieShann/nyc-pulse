import { type CSSProperties, type ReactNode } from 'react';
import {
  STATUS_META,
  NO_DATA_COLOR,
  NO_DATA_TINT,
  formatCount,
  type Status,
} from '../pulse';

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

/* OnlinePill — pulsing cyan dot + monospace count + ONLINE eyebrow. */
export function OnlinePill({ count }: { count: number }) {
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
        {formatCount(count)}
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

/* FeedRow — status tag, venue, mono time, cyan @handle, optional note. */
export function FeedRow({
  status,
  venue,
  handle,
  time,
  note,
  onClick,
}: {
  status: Status;
  venue: string;
  handle: string;
  time: string;
  note?: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="feed-row"
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
        <span style={{ fontSize: 14, color: 'var(--fg-1)', fontWeight: 600 }}>Vibe dropped.</span>
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
