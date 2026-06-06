import { useEffect, useMemo, useState } from 'react';
import { tables, reducers } from './module_bindings';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { Check, ChevronUp, Pencil, X } from 'lucide-react';
import type { Report, Spot } from './module_bindings/types';
import MapView from './MapView';
import BottomSheet from './components/BottomSheet';
import { useMediaQuery } from './lib/useMediaQuery';
import {
  FeedRow,
  HotRow,
  OnlinePill,
  PulseButton,
  Segmented,
  StatusButton,
  StatusTag,
  Toast,
  Wordmark,
} from './components/pulse-ui';
import {
  STATUS_META,
  STATUSES,
  HOT_RING_MIN,
  atHandle,
  formatAge,
  tsToMs,
  latestReportBySpot,
  hotSpots,
  handleFor,
  type Status,
} from './pulse';

const LEGEND: Status[] = ['packed', 'filling', 'chill', 'dead'];

function App() {
  const { isActive: connected, identity } = useSpacetimeDB();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const [spots] = useTable(tables.spot);
  const [reports] = useTable(tables.report);
  const [users] = useTable(tables.user);
  const [onlineUsers] = useTable(tables.user.where(r => r.online.eq(true)));

  const submitReport = useReducer(reducers.submitReport);
  const setHandle = useReducer(reducers.setHandle);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  const [selectedId, setSelectedId] = useState<bigint | null>(null);
  const [choice, setChoice] = useState<Status | null>(null);
  const [note, setNote] = useState('');
  const [tab, setTab] = useState<'hot' | 'feed'>('hot');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<{ status: Status; venue: string } | null>(null);

  const spotsById = useMemo(() => {
    const m = new Map<bigint, Spot>();
    for (const s of spots) m.set(s.id, s);
    return m;
  }, [spots]);
  const latestBySpot = useMemo(() => latestReportBySpot(reports), [reports]);
  const resolveHandle = useMemo(() => handleFor(users), [users]);
  const feed = useMemo(
    () => [...reports].sort((a, b) => tsToMs(b.createdAt) - tsToMs(a.createdAt)).slice(0, 30),
    [reports]
  );
  const hot = useMemo(() => hotSpots(reports, spotsById, now), [reports, spotsById, now]);
  const hotIds = useMemo(
    () => new Set(hot.filter(h => h.count >= HOT_RING_MIN).map(h => h.spot.id)),
    [hot]
  );
  const myHandle = useMemo(() => {
    if (!identity) return null;
    const hex = identity.toHexString();
    return users.find(u => u.identity.toHexString() === hex)?.handle ?? null;
  }, [users, identity]);

  const selectedSpot = selectedId != null ? spotsById.get(selectedId) ?? null : null;

  const selectSpot = (id: bigint) => {
    setSelectedId(id);
    setChoice(null);
    setNote('');
    if (!isDesktop) setSheetOpen(false);
  };
  const closeReport = () => {
    setSelectedId(null);
    setChoice(null);
    setNote('');
  };
  const dropVibe = () => {
    if (selectedId == null || !choice || !selectedSpot) return;
    submitReport({ spotId: selectedId, status: choice, note });
    setToast({ status: choice, venue: selectedSpot.name });
    setTimeout(() => setToast(null), 2600);
    closeReport();
  };

  if (!connected) {
    return (
      <div className="grid h-[100dvh] place-items-center" style={{ background: 'var(--ink-900)' }}>
        <div className="flex flex-col items-center gap-3">
          <Wordmark size={34} />
          <p className="breathe" style={{ fontSize: 14, color: 'var(--fg-3)' }}>
            tuning into the city…
          </p>
        </div>
      </div>
    );
  }

  const selectedLatest = selectedSpot ? latestBySpot.get(selectedSpot.id) : undefined;
  const selectedLatestHandle = selectedLatest
    ? atHandle(resolveHandle(selectedLatest.reporter.toHexString()))
    : undefined;
  const reportPanel = selectedSpot ? (
    <ReportPanel
      spot={selectedSpot}
      latest={selectedLatest}
      latestHandle={selectedLatestHandle}
      now={now}
      choice={choice}
      setChoice={setChoice}
      note={note}
      setNote={setNote}
      onDrop={dropVibe}
      onClose={closeReport}
    />
  ) : null;

  const listContent = (
    <div className="flex flex-col gap-3">
      <Segmented value={tab} onChange={setTab} />
      {tab === 'hot' ? (
        <div className="flex flex-col gap-2">
          <SectionHead title="Hot Now" hint="last 30 min" />
          {hot.length === 0 ? (
            <Empty>Quiet out there. Drop the first vibe.</Empty>
          ) : (
            hot.slice(0, 10).map((h, i) => (
              <HotRow
                key={h.spot.id.toString()}
                rank={i + 1}
                venue={h.spot.name}
                meta={`${h.spot.category} · ${h.count} ${h.count === 1 ? 'report' : 'reports'}`}
                status={h.latest.status as Status}
                onClick={() => selectSpot(h.spot.id)}
              />
            ))
          )}
        </div>
      ) : (
        <div className="flex flex-col">
          <SectionHead title="Live feed" live />
          {feed.length === 0 ? (
            <Empty>No reports yet. Tap a pin to call it.</Empty>
          ) : (
            feed.map(r => {
              const spot = spotsById.get(r.spotId);
              return (
                <FeedRow
                  key={r.id.toString()}
                  status={r.status as Status}
                  venue={spot?.name ?? 'Unknown spot'}
                  handle={atHandle(resolveHandle(r.reporter.toHexString()))}
                  time={formatAge(now - tsToMs(r.createdAt))}
                  note={r.note || undefined}
                  onClick={() => spot && selectSpot(spot.id)}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-[100dvh] w-full overflow-hidden md:flex" style={{ background: 'var(--ink-900)' }}>
      {/* Map column */}
      <div className="relative h-full w-full md:flex-1">
        <MapView
          spots={spots}
          latestBySpot={latestBySpot}
          hotIds={hotIds}
          now={now}
          selectedId={selectedId}
          selectedSpot={selectedSpot}
          onSelect={selectSpot}
          panOnSelect={!isDesktop}
        />

        <Toast show={!!toast} status={toast?.status ?? null} venue={toast?.venue ?? null} />

        {/* Floating top chrome */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[1200] flex flex-col gap-2.5 px-3"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}
        >
          <div className="pointer-events-auto flex items-center justify-between gap-2">
            <OnlinePill count={onlineUsers.length} />
            <HandleChip current={myHandle} onSet={name => setHandle({ name })} />
          </div>
          <Legend />
        </div>
      </div>

      {/* Panel: glass sidebar on desktop, draggable sheet on mobile */}
      {isDesktop ? (
        <aside
          className="hidden h-full w-[380px] shrink-0 overflow-y-auto p-3 md:block"
          style={{
            background: 'var(--glass-surface)',
            borderLeft: '1px solid var(--line-1)',
            backdropFilter: 'blur(var(--blur-sheet))',
            WebkitBackdropFilter: 'blur(var(--blur-sheet))',
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <Wordmark size={20} />
          </div>
          <div className="flex flex-col gap-4">
            {reportPanel ?? <TapPrompt />}
            {listContent}
          </div>
        </aside>
      ) : (
        <BottomSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          peek={
            selectedSpot ? (
              reportPanel
            ) : (
              <MobileSummary hotCount={hot.length} open={sheetOpen} />
            )
          }
        >
          <div className="pt-1">{listContent}</div>
        </BottomSheet>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SectionHead({ title, hint, live }: { title: string; hint?: string; live?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <span style={{ fontSize: 19, fontWeight: 600, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>
        {title}
      </span>
      {live ? (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--pulse)' }}>● live</span>
      ) : hint ? (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-3)' }}>{hint}</span>
      ) : null}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 14, color: 'var(--fg-3)', padding: '8px 2px' }}>{children}</p>
  );
}

function TapPrompt() {
  return (
    <div
      style={{
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed var(--line-2)',
        background: 'var(--ink-800)',
        padding: '18px 16px',
        fontSize: 14,
        color: 'var(--fg-2)',
      }}
    >
      Tap a glowing pin to call its vibe.
    </div>
  );
}

function ReportPanel({
  spot,
  latest,
  latestHandle,
  now,
  choice,
  setChoice,
  note,
  setNote,
  onDrop,
  onClose,
}: {
  spot: Spot;
  latest: Report | undefined;
  latestHandle?: string;
  now: number;
  choice: Status | null;
  setChoice: (s: Status) => void;
  note: string;
  setNote: (s: string) => void;
  onDrop: () => void;
  onClose: () => void;
}) {
  const fresh = !!latest;
  return (
    <div className="flex flex-col gap-4">
      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--fg-1)',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {spot.name}
          </div>
          <div style={{ fontSize: 14, color: 'var(--fg-2)', textTransform: 'capitalize' }}>
            {spot.category}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid shrink-0 place-items-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: 'var(--ink-600)',
            border: '1px solid var(--line-1)',
            color: 'var(--fg-2)',
          }}
        >
          <X size={16} strokeWidth={2.4} />
        </button>
      </div>

      {/* current status */}
      <div className="flex items-center gap-2.5">
        {fresh && latest ? (
          <>
            <StatusTag status={latest.status as Status} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-3)' }}>
              last report {formatAge(now - tsToMs(latest.createdAt))} ago
            </span>
          </>
        ) : (
          <>
            <StatusTag status="stale" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-3)' }}>
              no reports yet
            </span>
          </>
        )}
      </div>

      {/* most recent report's note (read-only context) */}
      {latest?.note && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--ink-800)',
            border: '1px solid var(--line-1)',
          }}
        >
          <span style={{ fontSize: 14, color: 'var(--fg-1)', lineHeight: 1.45 }}>
            “{latest.note}”
          </span>
          {latestHandle && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--pulse)' }}>
              {latestHandle}
            </span>
          )}
        </div>
      )}

      {/* prompt */}
      <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg-1)' }}>How's it right now?</span>

      {/* four big buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        {STATUSES.map(s => (
          <StatusButton key={s} status={s} selected={choice === s} onClick={() => setChoice(s)} />
        ))}
      </div>

      {/* note */}
      <textarea
        value={note}
        maxLength={140}
        rows={2}
        onChange={e => setNote(e.target.value)}
        placeholder="Add a note… (optional)"
        className="pulse-input"
        style={{
          resize: 'none',
          width: '100%',
          padding: '10px 12px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--ink-600)',
          border: '1px solid var(--line-1)',
          color: 'var(--fg-1)',
          fontSize: 14,
          fontFamily: 'var(--font-sans)',
          outline: 'none',
        }}
      />

      {/* CTA */}
      <PulseButton disabled={!choice} onClick={onDrop}>
        {choice ? 'Drop the vibe' : 'Pick a vibe'}
      </PulseButton>
    </div>
  );
}

function Legend() {
  return (
    <div
      className="pointer-events-auto self-start"
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'center',
        padding: '7px 12px',
        borderRadius: 'var(--radius-pill)',
        background: 'var(--glass-raised)',
        border: '1px solid var(--line-2)',
        backdropFilter: 'blur(var(--blur-control))',
        WebkitBackdropFilter: 'blur(var(--blur-control))',
      }}
    >
      {LEGEND.map(s => (
        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: STATUS_META[s].color,
              boxShadow: `0 0 8px ${STATUS_META[s].color}`,
            }}
          />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-2)', letterSpacing: '0.01em' }}>
            {STATUS_META[s].label}
          </span>
        </div>
      ))}
    </div>
  );
}

function HandleChip({ current, onSet }: { current: string | null; onSet: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  useEffect(() => setDraft(current ?? ''), [current]);

  const chrome: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    minHeight: 'var(--tap-min)',
    height: 36,
    padding: '0 8px 0 12px',
    borderRadius: 'var(--radius-pill)',
    background: 'var(--glass-raised)',
    border: '1px solid var(--line-2)',
    backdropFilter: 'blur(var(--blur-control))',
    WebkitBackdropFilter: 'blur(var(--blur-control))',
  };

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} style={{ ...chrome, cursor: 'pointer' }}>
        <Pencil size={12} color="var(--fg-3)" />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-1)', fontWeight: 500 }}>
          {current ? atHandle(current) : '@you'}
        </span>
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            background: 'linear-gradient(135deg, var(--pulse-dim), var(--status-dead))',
          }}
        />
      </button>
    );
  }
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        const name = draft.trim();
        if (name) onSet(name);
        setEditing(false);
      }}
      style={chrome}
    >
      <input
        autoFocus
        value={draft}
        maxLength={24}
        onChange={e => setDraft(e.target.value)}
        placeholder="handle"
        style={{
          width: 96,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          color: 'var(--fg-1)',
        }}
      />
      <button
        type="submit"
        aria-label="Save handle"
        className="grid place-items-center"
        style={{ width: 26, height: 26, borderRadius: 999, background: 'var(--pulse)', color: 'var(--fg-on-accent)' }}
      >
        <Check size={14} strokeWidth={2.5} />
      </button>
    </form>
  );
}

function MobileSummary({ hotCount, open }: { hotCount: number; open: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span
        className="breathe"
        style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--pulse)', boxShadow: 'var(--glow-pulse)' }}
      />
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg-1)' }}>
        {hotCount > 0 ? `${hotCount} ${hotCount === 1 ? 'spot' : 'spots'} buzzing now` : 'Tap a pin to call it'}
      </span>
      <span
        className="ml-auto flex items-center gap-1"
        style={{ fontSize: 12, color: 'var(--fg-3)' }}
      >
        {open ? 'close' : 'Hot Now · Live'}
        <ChevronUp size={16} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </span>
    </div>
  );
}

export default App;
