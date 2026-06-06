import { useEffect, useMemo, useState } from 'react';
import { tables, reducers } from './module_bindings';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import MapView from './MapView';
import {
  STATUSES,
  STATUS_META,
  HOT_WINDOW_MS,
  type Status,
  formatAge,
  tsToMs,
  latestReportBySpot,
  hotSpots,
  handleFor,
} from './lib';
import './App.css';

function App() {
  const { isActive: connected, identity } = useSpacetimeDB();

  // --- Live subscriptions. useTable auto-subscribes; rows update reactively. ---
  const [spots] = useTable(tables.spot);
  const [reports] = useTable(tables.report);
  const [users] = useTable(tables.user);
  const [onlineUsers] = useTable(tables.user.where(r => r.online.eq(true)));

  const submitReport = useReducer(reducers.submitReport);
  const setHandle = useReducer(reducers.setHandle);

  // A clock that ticks every 15s so relative times / staleness stay current
  // even when no new rows arrive.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const [selectedId, setSelectedId] = useState<bigint | null>(null);
  const [note, setNote] = useState('');

  // --- Derived data (memoized off the subscribed rows). ---
  const spotsById = useMemo(() => {
    const m = new Map<bigint, (typeof spots)[number]>();
    for (const s of spots) m.set(s.id, s);
    return m;
  }, [spots]);

  const latestBySpot = useMemo(() => latestReportBySpot(reports), [reports]);
  const resolveHandle = useMemo(() => handleFor(users), [users]);

  const feed = useMemo(
    () => [...reports].sort((a, b) => tsToMs(b.createdAt) - tsToMs(a.createdAt)).slice(0, 25),
    [reports]
  );
  const hot = useMemo(() => hotSpots(reports, spotsById, now), [reports, spotsById, now]);

  const myHandle = useMemo(() => {
    if (!identity) return null;
    const hex = identity.toHexString();
    return users.find(u => u.identity.toHexString() === hex)?.handle ?? null;
  }, [users, identity]);

  const selectedSpot = selectedId != null ? spotsById.get(selectedId) ?? null : null;

  // Clear the note when switching spots.
  useEffect(() => setNote(''), [selectedId]);

  const onReport = (status: Status) => {
    if (selectedId == null) return;
    submitReport({ spotId: selectedId, status, note });
    setNote('');
  };

  if (!connected) {
    return (
      <div className="loading">
        <h1>NYC Pulse</h1>
        <p>Connecting to SpacetimeDB…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="map-wrap">
        <MapView
          spots={spots}
          latestBySpot={latestBySpot}
          now={now}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <Legend />
      </div>

      <aside className="sidebar">
        <header className="brand">
          <h1>NYC Pulse</h1>
          <span className="online">
            <span className="dot" /> {onlineUsers.length} online
          </span>
        </header>

        <HandleEditor current={myHandle} onSet={name => setHandle({ name })} />

        <ReportPanel
          spot={selectedSpot}
          latest={selectedSpot ? latestBySpot.get(selectedSpot.id) : undefined}
          now={now}
          note={note}
          setNote={setNote}
          onReport={onReport}
          onClose={() => setSelectedId(null)}
        />

        <section className="panel">
          <h2>🔥 Hot now <span className="muted">· last 30 min</span></h2>
          {hot.length === 0 ? (
            <p className="empty">No reports in the last 30 minutes. Be the first!</p>
          ) : (
            <ol className="hot">
              {hot.slice(0, 8).map(({ spot, count, latest }) => (
                <li key={spot.id.toString()} onClick={() => setSelectedId(spot.id)}>
                  <span
                    className="rank-dot"
                    style={{ background: STATUS_META[latest.status as Status]?.color }}
                  />
                  <span className="hot-name">{spot.name}</span>
                  <span className="hot-count">
                    {count} {count === 1 ? 'report' : 'reports'}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="panel">
          <h2>📡 Live feed</h2>
          {feed.length === 0 ? (
            <p className="empty">No reports yet. Tap a pin to add one.</p>
          ) : (
            <ul className="feed">
              {feed.map(r => {
                const spot = spotsById.get(r.spotId);
                const meta = STATUS_META[r.status as Status];
                return (
                  <li key={r.id.toString()} onClick={() => spot && setSelectedId(spot.id)}>
                    <span className="badge" style={{ background: meta?.color ?? '#999' }}>
                      {meta?.label ?? r.status}
                    </span>
                    <span className="feed-body">
                      <strong>{spot?.name ?? 'Unknown spot'}</strong>
                      {r.note ? <em className="feed-note"> “{r.note}”</em> : null}
                      <span className="feed-meta">
                        {resolveHandle(r.reporter.toHexString())} ·{' '}
                        {formatAge(now - tsToMs(r.createdAt))}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

function Legend() {
  return (
    <div className="legend">
      {STATUSES.map(s => (
        <span key={s} className="legend-item">
          <span className="legend-dot" style={{ background: STATUS_META[s].color }} />
          {STATUS_META[s].label}
        </span>
      ))}
      <span className="legend-item">
        <span className="legend-dot" style={{ background: '#9e9e9e' }} />
        No data / stale
      </span>
    </div>
  );
}

function HandleEditor({
  current,
  onSet,
}: {
  current: string | null;
  onSet: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  useEffect(() => setDraft(current ?? ''), [current]);

  if (!editing) {
    return (
      <div className="handle-row">
        You are <strong>{current ?? '…'}</strong>
        <button className="link" onClick={() => setEditing(true)}>
          change
        </button>
      </div>
    );
  }
  return (
    <form
      className="handle-row"
      onSubmit={e => {
        e.preventDefault();
        const name = draft.trim();
        if (name) onSet(name);
        setEditing(false);
      }}
    >
      <input
        autoFocus
        value={draft}
        maxLength={24}
        placeholder="your handle"
        onChange={e => setDraft(e.target.value)}
      />
      <button type="submit">Save</button>
    </form>
  );
}

type ReportPanelProps = {
  spot: { id: bigint; name: string; category: string } | null;
  latest: { status: string; createdAt: import('spacetimedb').Timestamp } | undefined;
  now: number;
  note: string;
  setNote: (s: string) => void;
  onReport: (status: Status) => void;
  onClose: () => void;
};

function ReportPanel({ spot, latest, now, note, setNote, onReport, onClose }: ReportPanelProps) {
  if (!spot) {
    return (
      <section className="panel report-panel empty-panel">
        <p className="empty">👈 Tap a pin on the map to report how busy it is.</p>
      </section>
    );
  }
  return (
    <section className="panel report-panel">
      <div className="report-head">
        <div>
          <h2>{spot.name}</h2>
          <span className="muted">{spot.category}</span>
        </div>
        <button className="link" onClick={onClose}>
          ✕
        </button>
      </div>
      {latest ? (
        <p className="current">
          Now:{' '}
          <span style={{ color: STATUS_META[latest.status as Status]?.color, fontWeight: 700 }}>
            {STATUS_META[latest.status as Status]?.label ?? latest.status}
          </span>{' '}
          <span className="muted">· {formatAge(now - tsToMs(latest.createdAt))}</span>
        </p>
      ) : (
        <p className="current muted">No reports yet — set the first one.</p>
      )}
      <div className="status-buttons">
        {STATUSES.map(s => (
          <button
            key={s}
            className="status-btn"
            style={{ background: STATUS_META[s].color }}
            title={STATUS_META[s].blurb}
            onClick={() => onReport(s)}
          >
            {STATUS_META[s].label}
          </button>
        ))}
      </div>
      <input
        className="note-input"
        value={note}
        maxLength={140}
        placeholder="optional note (e.g. line out the door)"
        onChange={e => setNote(e.target.value)}
      />
      <p className="hint">Pick a status above to submit{note ? ' with your note' : ''}.</p>
      <span className="muted small">
        window for “Hot now”: {Math.round(HOT_WINDOW_MS / 60000)} min
      </span>
    </section>
  );
}

export default App;
