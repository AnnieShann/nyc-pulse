import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { tables, reducers } from './module_bindings';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { Bookmark, ChevronUp, Clock, X } from 'lucide-react';
import type { Report, Spot } from './module_bindings/types';
import MapView from './MapView';
import BottomSheet from './components/BottomSheet';
import { useMediaQuery } from './lib/useMediaQuery';
import {
  ActivityStrip,
  CategoryChips,
  ConfirmChip,
  FeedRow,
  HotRow,
  OnlinePill,
  PhotoStrip,
  PlaceDetails,
  PlaceLinks,
  PulseButton,
  SearchBar,
  SearchResults,
  Segmented,
  StatusButton,
  StatusTag,
  Toast,
  Wordmark,
  type SearchItem,
} from './components/pulse-ui';
import CameraCapture from './components/CameraCapture';
import { Onboarding, ProfileEditModal } from './components/Profile';
import { placeInfoFor, mapsSearchUrl, mapsDirectionsUrl, type PlaceInfo } from './placeInfo';
import type { Photo } from './module_bindings/types';
import {
  STATUS_META,
  STATUSES,
  STALE_MS,
  CONFIRM_FEED_BONUS_MS,
  atHandle,
  formatAge,
  tsToMs,
  latestReportBySpot,
  heatScoresBySpot,
  confirmCountsByReport,
  freshWaitBySpot,
  photosBySpot,
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
  const [confirmations] = useTable(tables.confirmation);
  const [waits] = useTable(tables.waitTime);
  const [photos] = useTable(tables.photo);
  const [profiles, profilesReady] = useTable(tables.profile);
  const [saved] = useTable(tables.savedSpot);

  const submitReport = useReducer(reducers.submitReport);
  const confirmReport = useReducer(reducers.confirmReport);
  const reportWait = useReducer(reducers.reportWait);
  const addPhoto = useReducer(reducers.addPhoto);
  const setProfile = useReducer(reducers.setProfile);
  const toggleSaved = useReducer(reducers.toggleSaved);
  const setSavedPublic = useReducer(reducers.setSavedPublic);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  const [selectedId, setSelectedId] = useState<bigint | null>(null);
  const [choice, setChoice] = useState<Status | null>(null);
  const [note, setNote] = useState('');
  const [tab, setTab] = useState<'hot' | 'feed' | 'saved'>('hot');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [toast, setToast] = useState<{ status: Status | null; venue: string } | null>(null);
  // Draft wait selection — applied locally instantly, committed on Save.
  const [waitChoice, setWaitChoice] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);

  const spotsById = useMemo(() => {
    const m = new Map<bigint, Spot>();
    for (const s of spots) m.set(s.id, s);
    return m;
  }, [spots]);
  const latestBySpot = useMemo(() => latestReportBySpot(reports), [reports]);
  const resolveHandle = useMemo(() => handleFor(users), [users]);

  // F8 confirmations per report + F9 current wait per spot.
  const confirmsByReport = useMemo(() => confirmCountsByReport(confirmations), [confirmations]);
  const waitBySpot = useMemo(() => freshWaitBySpot(waits, now), [waits, now]);
  const photoMap = useMemo(() => photosBySpot(photos), [photos]);

  // Live feed sorted newest-first, but confirmed reports float up (F8).
  const feed = useMemo(() => {
    const score = (r: Report) =>
      tsToMs(r.createdAt) + (confirmsByReport.get(r.id) ?? 0) * CONFIRM_FEED_BONUS_MS;
    return [...reports].sort((a, b) => score(b) - score(a)).slice(0, 30);
  }, [reports, confirmsByReport]);
  const hot = useMemo(() => hotSpots(reports, spotsById, now), [reports, spotsById, now]);
  const heatBySpot = useMemo(
    () => heatScoresBySpot(reports, now, confirmsByReport, waitBySpot),
    [reports, now, confirmsByReport, waitBySpot]
  );

  // F3: category filters — default all on (hidden = empty set).
  const categories = useMemo(
    () => Array.from(new Set(spots.map(s => s.category))).sort(),
    [spots]
  );
  const [hiddenCats, setHiddenCats] = useState<Set<string>>(new Set());
  const toggleCat = (c: string) =>
    setHiddenCats(prev => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  const visibleSpots = useMemo(
    () => spots.filter(s => !hiddenCats.has(s.category)),
    [spots, hiddenCats]
  );

  // Search across ALL spots (ignores category filter) with status/wait/heat.
  const searchItems = useMemo<SearchItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return spots
      .filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
      .map(s => {
        const latest = latestBySpot.get(s.id);
        const fresh = !!latest && now - tsToMs(latest.createdAt) <= STALE_MS;
        return {
          id: s.id,
          name: s.name,
          category: s.category,
          status: (fresh && latest ? (latest.status as Status) : 'stale') as Status | 'stale',
          waitMinutes: waitBySpot.get(s.id)?.minutes ?? null,
        };
      })
      .sort((a, b) => {
        const as = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bs = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        return as - bs || a.name.localeCompare(b.name);
      })
      .slice(0, 8);
  }, [searchQuery, spots, latestBySpot, waitBySpot, now]);

  // Hot Now ranked by recent report count, filtered by active categories.
  const hotRanked = useMemo(
    () => hot.filter(h => !hiddenCats.has(h.spot.category)),
    [hot, hiddenCats]
  );

  const selectedReports = useMemo(
    () =>
      selectedId == null
        ? []
        : [...reports]
            .filter(r => r.spotId === selectedId)
            .sort((a, b) => tsToMs(b.createdAt) - tsToMs(a.createdAt)),
    [reports, selectedId]
  );

  // Track which feed reports are new, so they can animate in (skip first load).
  const seenFeed = useRef<Set<string>>(new Set());
  const feedSeeded = useRef(false);
  useEffect(() => {
    for (const r of feed) seenFeed.current.add(r.id.toString());
    feedSeeded.current = true;
  }, [feed]);
  const isNewReport = (id: bigint) => feedSeeded.current && !seenFeed.current.has(id.toString());
  const myHex = identity?.toHexString() ?? '';
  const myHandle = useMemo(
    () => users.find(u => u.identity.toHexString() === myHex)?.handle ?? null,
    [users, myHex]
  );
  const myProfile = useMemo(
    () => profiles.find(p => p.identity.toHexString() === myHex),
    [profiles, myHex]
  );
  const mySavedIds = useMemo(
    () => new Set(saved.filter(s => s.owner.toHexString() === myHex).map(s => s.spotId)),
    [saved, myHex]
  );
  const savedItems = useMemo<SearchItem[]>(
    () =>
      [...mySavedIds]
        .map(id => spotsById.get(id))
        .filter((s): s is Spot => !!s)
        .map(s => {
          const latest = latestBySpot.get(s.id);
          const fresh = !!latest && now - tsToMs(latest.createdAt) <= STALE_MS;
          return {
            id: s.id,
            name: s.name,
            category: s.category,
            status: (fresh && latest ? (latest.status as Status) : 'stale') as Status | 'stale',
            waitMinutes: waitBySpot.get(s.id)?.minutes ?? null,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [mySavedIds, spotsById, latestBySpot, waitBySpot, now]
  );

  const selectedSpot = selectedId != null ? spotsById.get(selectedId) ?? null : null;

  const resetDraft = () => {
    setChoice(null);
    setNote('');
    setWaitChoice(null);
  };
  const selectSpot = (id: bigint) => {
    setSelectedId(id);
    resetDraft();
    if (!isDesktop) setSheetOpen(false);
  };
  const closeReport = () => {
    setSelectedId(null);
    resetDraft();
  };
  const toggleChoice = (s: Status) => setChoice(c => (c === s ? null : s));

  // Save whatever changed — vibe, note, and/or wait — independently. Nothing
  // requires a status: a note rides on the chosen vibe, or the spot's current
  // vibe if one exists.
  const onSave = () => {
    if (selectedId == null || !selectedSpot) return;
    const latest = selectedReports[0];
    const curWait = waitBySpot.get(selectedId)?.minutes ?? null;
    const waitChanged = waitChoice !== null && waitChoice !== curWait;
    const status: Status | null =
      choice ?? (note.trim() !== '' && latest ? (latest.status as Status) : null);

    let saved = false;
    if (waitChanged) {
      reportWait({ spotId: selectedId, minutes: waitChoice! });
      saved = true;
    }
    if (status) {
      submitReport({ spotId: selectedId, status, note });
      saved = true;
    }
    if (!saved) return;
    setToast({ status, venue: selectedSpot.name });
    setTimeout(() => setToast(null), 2600);
    resetDraft();
  };

  if (!connected || !profilesReady) {
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
  if (identity && !myProfile?.onboarded) {
    return (
      <Onboarding
        initial={{ name: '', email: '', bio: '', avatar: '' }}
        onComplete={v => setProfile({ name: v.name, email: v.email, bio: v.bio, avatar: v.avatar })}
      />
    );
  }

  const selLatest = selectedReports[0];
  const curWait = selectedId != null ? waitBySpot.get(selectedId) : undefined;
  const curWaitMin = curWait?.minutes ?? null;
  const waitChanged = waitChoice !== null && waitChoice !== curWaitMin;
  const canSave =
    choice !== null || waitChanged || (note.trim() !== '' && selLatest != null);
  const reportPanel = selectedSpot ? (
    <ReportPanel
      spot={selectedSpot}
      info={placeInfoFor(selectedSpot.name)}
      photos={selectedId != null ? photoMap.get(selectedId) ?? [] : []}
      onOpenCamera={() => setCameraOpen(true)}
      isSaved={selectedId != null && mySavedIds.has(selectedId)}
      onToggleSave={() => selectedId != null && toggleSaved({ spotId: selectedId })}
      spotReports={selectedReports}
      resolveHandle={resolveHandle}
      now={now}
      confirms={selLatest ? confirmsByReport.get(selLatest.id) ?? 0 : 0}
      onConfirm={() => selLatest && confirmReport({ reportId: selLatest.id })}
      currentWait={curWait}
      waitMinutes={waitChoice ?? curWaitMin}
      onPickWait={setWaitChoice}
      choice={choice}
      onToggleVibe={toggleChoice}
      note={note}
      setNote={setNote}
      canSave={canSave}
      onSave={onSave}
      onClose={closeReport}
    />
  ) : null;

  const visibleFeed = feed.filter(r => {
    const sp = spotsById.get(r.spotId);
    return sp && !hiddenCats.has(sp.category);
  });

  const listContent = (
    <div className="flex flex-col gap-3">
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { k: 'hot', label: 'Hot Now' },
          { k: 'feed', label: 'Live' },
          { k: 'saved', label: 'Saved' },
        ]}
      />
      {tab === 'saved' ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 19, fontWeight: 600, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>
              Saved
            </span>
            <button
              type="button"
              className="press"
              onClick={() => setSavedPublic({ isPublic: !myProfile?.savedPublic })}
              style={{
                height: 30,
                padding: '0 12px',
                borderRadius: 'var(--radius-pill)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: myProfile?.savedPublic ? 'rgba(45,230,200,0.14)' : 'var(--ink-600)',
                border: `1px solid ${myProfile?.savedPublic ? 'var(--line-pulse)' : 'var(--line-1)'}`,
                color: myProfile?.savedPublic ? 'var(--pulse)' : 'var(--fg-2)',
              }}
            >
              {myProfile?.savedPublic ? 'Public' : 'Make public'}
            </button>
          </div>
          {savedItems.length === 0 ? (
            <Empty>No saved spots yet. Tap the bookmark on a spot to save it.</Empty>
          ) : (
            <SearchResults items={savedItems} onPick={selectSpot} />
          )}
        </div>
      ) : tab === 'hot' ? (
        <div className="flex flex-col gap-2">
          <SectionHead title="Hot Now" hint="last 30 min" />
          {hotRanked.length === 0 ? (
            <Empty>Quiet out there. Drop the first vibe.</Empty>
          ) : (
            hotRanked.slice(0, 10).map((h, i) => (
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
          {visibleFeed.length === 0 ? (
            <Empty>No reports yet. Tap a pin to call it.</Empty>
          ) : (
            visibleFeed.map(r => {
              const spot = spotsById.get(r.spotId);
              return (
                <FeedRow
                  key={r.id.toString()}
                  status={r.status as Status}
                  venue={spot?.name ?? 'Unknown spot'}
                  handle={atHandle(resolveHandle(r.reporter.toHexString()))}
                  time={formatAge(now - tsToMs(r.createdAt))}
                  note={r.note || undefined}
                  confirms={confirmsByReport.get(r.id) ?? 0}
                  isNew={isNewReport(r.id)}
                  onClick={() => spot && selectSpot(spot.id)}
                  onConfirm={() => confirmReport({ reportId: r.id })}
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
          spots={visibleSpots}
          latestBySpot={latestBySpot}
          heatBySpot={heatBySpot}
          waitBySpot={waitBySpot}
          now={now}
          selectedId={selectedId}
          selectedSpot={selectedSpot}
          onSelect={selectSpot}
          panOnSelect={!isDesktop}
        />
        <div className="map-vignette" />

        <Toast show={!!toast} status={toast?.status ?? null} venue={toast?.venue ?? null} />

        {/* Floating top chrome */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[1200] flex flex-col gap-2.5 px-3"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}
        >
          <div className="pointer-events-auto flex items-center justify-between gap-2">
            <OnlinePill count={onlineUsers.length} />
            <ProfileChip
              name={myHandle ?? 'you'}
              avatar={myProfile?.avatar ?? ''}
              onClick={() => setEditProfile(true)}
            />
          </div>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />
          {searchQuery.trim() ? (
            <SearchResults
              items={searchItems}
              onPick={id => {
                selectSpot(id);
                setSearchQuery('');
              }}
            />
          ) : (
            <>
              <Legend />
              <CategoryChips
                categories={categories}
                hidden={hiddenCats}
                allOn={hiddenCats.size === 0}
                onToggle={toggleCat}
                onAll={() => setHiddenCats(new Set())}
              />
            </>
          )}
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
              <MobileSummary hotCount={hotRanked.length} open={sheetOpen} />
            )
          }
        >
          <div className="pt-1">{listContent}</div>
        </BottomSheet>
      )}

      {cameraOpen && selectedSpot && (
        <CameraCapture
          spotName={selectedSpot.name}
          onClose={() => setCameraOpen(false)}
          onCapture={data => {
            if (selectedId != null) addPhoto({ spotId: selectedId, data });
            setCameraOpen(false);
          }}
        />
      )}

      {editProfile && (
        <ProfileEditModal
          initial={{
            name: myHandle ?? '',
            email: myProfile?.email ?? '',
            bio: myProfile?.bio ?? '',
            avatar: myProfile?.avatar ?? '',
          }}
          onSave={v => {
            setProfile({ name: v.name, email: v.email, bio: v.bio, avatar: v.avatar });
            setEditProfile(false);
          }}
          onClose={() => setEditProfile(false)}
        />
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

const WAIT_OPTIONS = [0, 5, 15, 30, 45, 60];

const eyebrowStyle: CSSProperties = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: 'var(--fg-3)',
  fontWeight: 600,
};

function ReportPanel({
  spot,
  info,
  photos,
  onOpenCamera,
  isSaved,
  onToggleSave,
  spotReports,
  resolveHandle,
  now,
  confirms,
  onConfirm,
  currentWait,
  waitMinutes,
  onPickWait,
  choice,
  onToggleVibe,
  note,
  setNote,
  canSave,
  onSave,
  onClose,
}: {
  spot: Spot;
  info: PlaceInfo;
  photos: Photo[];
  onOpenCamera: () => void;
  isSaved: boolean;
  onToggleSave: () => void;
  spotReports: Report[];
  resolveHandle: (idHex: string) => string;
  now: number;
  confirms: number;
  onConfirm: () => void;
  currentWait: { minutes: number; ageMs: number } | undefined;
  waitMinutes: number | null;
  onPickWait: (minutes: number) => void;
  choice: Status | null;
  onToggleVibe: (s: Status) => void;
  note: string;
  setNote: (s: string) => void;
  canSave: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const latest = spotReports[0];
  const recentNotes = spotReports.filter(r => r.note).slice(0, 3);
  const noteNeedsVibe = note.trim() !== '' && !choice && !latest;
  return (
    <div className="flex flex-col" style={{ gap: 18 }}>
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
          <div style={{ fontSize: 14, color: 'var(--fg-2)' }}>
            {info.price ? <>{info.price} · </> : null}
            <span style={{ textTransform: 'capitalize' }}>{spot.category}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onToggleSave}
            aria-label={isSaved ? 'Remove from saved' : 'Save to list'}
            title={isSaved ? 'Saved' : 'Save to your list'}
            className="press grid place-items-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: isSaved ? 'rgba(45,230,200,0.14)' : 'var(--ink-600)',
              border: `1px solid ${isSaved ? 'var(--line-pulse)' : 'var(--line-1)'}`,
              color: isSaved ? 'var(--pulse)' : 'var(--fg-2)',
              cursor: 'pointer',
            }}
          >
            <Bookmark size={16} strokeWidth={2.2} fill={isSaved ? 'var(--pulse)' : 'none'} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid place-items-center"
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
      </div>

      {/* place info (Google-style): live photos, links, details */}
      <PhotoStrip photos={photos} now={now} onAdd={onOpenCamera} />
      <PlaceLinks
        website={info.website}
        directionsUrl={mapsDirectionsUrl(spot.latitude, spot.longitude)}
        mapsUrl={mapsSearchUrl(spot.name)}
      />
      <PlaceDetails blurb={info.blurb} tags={info.tags} />

      {/* current status + live activity */}
      <div className="flex flex-col" style={{ gap: 10 }}>
        <div className="flex items-center gap-2.5">
          {latest ? (
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
          {latest && (
            <ConfirmChip
              confirms={confirms}
              onConfirm={onConfirm}
              label="Still accurate"
              style={{ marginLeft: 'auto' }}
            />
          )}
        </div>
        <ActivityStrip reports={spotReports} now={now} />
      </div>

      {/* recent notes (plural) */}
      {recentNotes.length > 0 && (
        <div className="flex flex-col" style={{ gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--fg-3)',
              fontWeight: 600,
            }}
          >
            Recent notes
          </span>
          {recentNotes.map(r => (
            <div
              key={r.id.toString()}
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
              <span style={{ fontSize: 14, color: 'var(--fg-1)', lineHeight: 1.45 }}>“{r.note}”</span>
              <span style={{ display: 'flex', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                <span style={{ color: 'var(--pulse)' }}>
                  {atHandle(resolveHandle(r.reporter.toHexString()))}
                </span>
                <span style={{ color: 'var(--fg-3)' }}>{formatAge(now - tsToMs(r.createdAt))}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ---- adjust any of these (all optional), then Save ---- */}
      <div style={{ height: 1, background: 'var(--line-1)', margin: '2px 0' }} />

      {/* vibe (optional) */}
      <div className="flex flex-col" style={{ gap: 8 }}>
        <span style={eyebrowStyle}>Vibe</span>
        <div className="grid grid-cols-2 gap-2.5">
          {STATUSES.map(s => (
            <StatusButton key={s} status={s} selected={choice === s} onClick={() => onToggleVibe(s)} />
          ))}
        </div>
      </div>

      {/* note (optional) */}
      <div className="flex flex-col" style={{ gap: 8 }}>
        <span style={eyebrowStyle}>Note</span>
        <textarea
          value={note}
          maxLength={140}
          rows={2}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a note…"
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
      </div>

      {/* wait (optional) */}
      <div className="flex flex-col" style={{ gap: 8 }}>
        <div className="flex items-center justify-between">
          <span style={{ ...eyebrowStyle, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Clock size={12} /> Wait time
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-3)' }}>
            {currentWait
              ? `now ~${currentWait.minutes} min · ${formatAge(currentWait.ageMs)} ago`
              : 'none yet'}
          </span>
        </div>
        <div className="no-scrollbar" style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {WAIT_OPTIONS.map(m => {
            const active = waitMinutes === m;
            return (
              <button
                key={m}
                type="button"
                className="press"
                onClick={() => onPickWait(m)}
                style={{
                  flexShrink: 0,
                  height: 34,
                  padding: '0 13px',
                  borderRadius: 'var(--radius-pill)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: active ? 'rgba(45,230,200,0.14)' : 'var(--ink-600)',
                  border: `1px solid ${active ? 'var(--line-pulse)' : 'var(--line-1)'}`,
                  color: active ? 'var(--pulse)' : 'var(--fg-2)',
                }}
              >
                {m === 0 ? 'None' : m === 60 ? '60+' : `${m}m`}
              </button>
            );
          })}
        </div>
      </div>

      {/* save */}
      <PulseButton disabled={!canSave} onClick={onSave}>
        Save
      </PulseButton>
      {noteNeedsVibe && (
        <span style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: -10 }}>
          Pick a vibe to post this spot's first note.
        </span>
      )}
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

function ProfileChip({
  name,
  avatar,
  onClick,
}: {
  name: string;
  avatar: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Edit profile"
      className="press"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 'var(--tap-min)',
        height: 36,
        padding: '0 6px 0 12px',
        borderRadius: 'var(--radius-pill)',
        background: 'var(--glass-raised)',
        border: '1px solid var(--line-2)',
        backdropFilter: 'blur(var(--blur-control))',
        WebkitBackdropFilter: 'blur(var(--blur-control))',
        color: 'var(--fg-1)',
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 500,
          maxWidth: 92,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {atHandle(name)}
      </span>
      <span
        style={{
          width: 24,
          height: 24,
          flexShrink: 0,
          borderRadius: 999,
          overflow: 'hidden',
          background: avatar ? 'transparent' : 'linear-gradient(135deg, var(--pulse-dim), var(--status-dead))',
        }}
      >
        {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
      </span>
    </button>
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
