import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { tables, reducers } from './module_bindings';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { Bookmark, Clock, Star, X } from 'lucide-react';
import type { Report, Spot } from './module_bindings/types';
import MapView from './MapView';
import BottomSheet from './components/BottomSheet';
import { useGeolocation } from './lib/useGeolocation';
import {
  CategoryChips,
  CompositeHeader,
  DistributionBar,
  History,
  OnlinePill,
  PhotoStrip,
  PlaceDetails,
  PlaceLinks,
  PulseButton,
  SearchBar,
  SearchResults,
  StatusButton,
  Toast,
  Wordmark,
  type SearchItem,
} from './components/pulse-ui';
import {
  ChatPanel,
  ItineraryScreen,
  NavBar,
  ProfileScreen,
  TouristToggle,
  WishlistDetail,
  type ActivityItem,
  type RecCard,
  type Tab,
} from './components/Screens';
import CameraCapture from './components/CameraCapture';
import { Onboarding, ProfileEditModal } from './components/Profile';
import {
  rankCandidates,
  priceLevel,
  distanceLabel,
  EMPTY_FILTERS,
  type Candidate,
  type Ranked,
} from './lib/recommend';
import { placeInfoFor, mapsSearchUrl, mapsDirectionsUrl, type PlaceInfo } from './placeInfo';
import type { Photo } from './module_bindings/types';
import {
  STATUSES,
  STALE_MS,
  COMPOSITE_WINDOW_MS,
  STATUS_META,
  atHandle,
  scoreToColor,
  scoreToLabel,
  NO_DATA_COLOR,
  tsToMs,
  latestReportBySpot,
  compositeBySpot,
  confirmCountsByReport,
  freshWaitBySpot,
  photosBySpot,
  handleFor,
  type Composite,
  type Status,
} from './pulse';


function App() {
  const { isActive: connected, identity } = useSpacetimeDB();
  const userLoc = useGeolocation();

  const [spots] = useTable(tables.spot);
  const [reports] = useTable(tables.report);
  const [users] = useTable(tables.user);
  const [onlineUsers] = useTable(tables.user.where(r => r.online.eq(true)));
  const [confirmations] = useTable(tables.confirmation);
  const [waits] = useTable(tables.waitTime);
  const [photos] = useTable(tables.photo);
  const [profiles, profilesReady] = useTable(tables.profile);
  const [saved] = useTable(tables.savedSpot);
  const [tripStops] = useTable(tables.tripStop);
  const [trips] = useTable(tables.trip);
  const [wishlists, wishlistsReady] = useTable(tables.wishlist);
  const [wishlistItems] = useTable(tables.wishlistItem);

  const submitReport = useReducer(reducers.submitReport);
  const confirmReport = useReducer(reducers.confirmReport);
  const reportWait = useReducer(reducers.reportWait);
  const addPhoto = useReducer(reducers.addPhoto);
  const setProfile = useReducer(reducers.setProfile);
  const toggleSaved = useReducer(reducers.toggleSaved);
  const addToTrip = useReducer(reducers.addToTrip);
  const removeTripStop = useReducer(reducers.removeTripStop);
  const createWishlist = useReducer(reducers.createWishlist);
  const addToWishlist = useReducer(reducers.addToWishlist);
  const removeWishlistItem = useReducer(reducers.removeWishlistItem);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  const [selectedId, setSelectedId] = useState<bigint | null>(null);
  const [choice, setChoice] = useState<Status | null>(null);
  const [note, setNote] = useState('');
  const [view, setView] = useState<Tab>('explore');
  const [touristMode, setTouristMode] = useState<'tourist' | 'local'>('tourist');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editProfile, setEditProfile] = useState(false);
  const [focusId, setFocusId] = useState<bigint | null>(null);
  const [recs, setRecs] = useState<Ranked[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [openWishlistId, setOpenWishlistId] = useState<bigint | null>(null);
  const [toast, setToast] = useState<{ label: string; status: Status | null; venue: string } | null>(
    null
  );
  const flashToast = (t: { label: string; status: Status | null; venue: string }) => {
    setToast(t);
    setTimeout(() => setToast(null), 2600);
  };
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

  const compositeMap = useMemo(() => compositeBySpot(reports, now), [reports, now]);

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

  const selectedReports = useMemo(
    () =>
      selectedId == null
        ? []
        : [...reports]
            .filter(r => r.spotId === selectedId)
            .sort((a, b) => tsToMs(b.createdAt) - tsToMs(a.createdAt)),
    [reports, selectedId]
  );

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
  // Profile "Activity": my own reports, newest first.
  const myActivity = useMemo<ActivityItem[]>(
    () =>
      [...reports]
        .filter(r => r.reporter.toHexString() === myHex)
        .sort((a, b) => tsToMs(b.createdAt) - tsToMs(a.createdAt))
        .slice(0, 20)
        .map(r => ({
          id: r.id.toString(),
          spotName: spotsById.get(r.spotId)?.name ?? 'Spot',
          note: r.note ?? '',
          ageMs: now - tsToMs(r.createdAt),
          status: r.status as Status,
        })),
    [reports, myHex, spotsById, now]
  );

  // Spots on my active trip (most-recently-created trip) → for the "Added" state.
  const myTripSpotIds = useMemo(
    () => new Set(tripStops.filter(s => s.owner.toHexString() === myHex).map(s => s.spotId)),
    [tripStops, myHex]
  );

  // ---- Itinerary tab data ----
  const myTrips = useMemo(
    () =>
      [...trips]
        .filter(t => t.owner.toHexString() === myHex)
        .sort((a, b) => tsToMs(b.createdAt) - tsToMs(a.createdAt)),
    [trips, myHex]
  );
  const currentTrip = useMemo(() => {
    const active = myTrips[0];
    if (!active) return null;
    const stops = [...tripStops]
      .filter(s => s.tripId === active.id)
      .sort((a, b) => tsToMs(a.createdAt) - tsToMs(b.createdAt))
      .map(s => ({ id: s.id, name: spotsById.get(s.spotId)?.name ?? 'Spot' }));
    return { name: active.name, stops };
  }, [myTrips, tripStops, spotsById]);
  const pastTrips = useMemo(
    () =>
      myTrips.slice(1).map(t => ({
        id: t.id.toString(),
        name: t.name,
        stopCount: tripStops.filter(s => s.tripId === t.id).length,
        dateLabel: new Date(Number(t.createdAt.microsSinceUnixEpoch / 1000n)).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
      })),
    [myTrips, tripStops]
  );
  const myWishlists = useMemo(
    () =>
      [...wishlists]
        .filter(w => w.owner.toHexString() === myHex)
        .sort((a, b) => tsToMs(a.createdAt) - tsToMs(b.createdAt))
        .map(w => ({
          id: w.id,
          name: w.name,
          color: w.color,
          count: wishlistItems.filter(i => i.wishlistId === w.id).length,
        })),
    [wishlists, wishlistItems, myHex]
  );
  const openWishlist =
    openWishlistId != null
      ? wishlists.find(w => w.id === openWishlistId && w.owner.toHexString() === myHex) ?? null
      : null;
  const openWishlistItems = useMemo(
    () =>
      openWishlistId == null
        ? []
        : [...wishlistItems]
            .filter(i => i.wishlistId === openWishlistId)
            .sort((a, b) => tsToMs(a.createdAt) - tsToMs(b.createdAt))
            .map(i => ({
              id: i.id,
              spotId: i.spotId,
              name: spotsById.get(i.spotId)?.name ?? 'Spot',
              category: spotsById.get(i.spotId)?.category ?? '',
            })),
    [openWishlistId, wishlistItems, spotsById]
  );
  const openWishlistSpotIds = useMemo(
    () => new Set(openWishlistItems.map(i => i.spotId)),
    [openWishlistItems]
  );
  const allSpotsLite = useMemo(
    () => spots.map(s => ({ id: s.id, name: s.name, category: s.category })),
    [spots]
  );

  // Seed 4 default wishlists once, for testing (only after the table has loaded
  // and only if the user has none).
  const seededWishlists = useRef(false);
  useEffect(() => {
    if (!connected || !identity || !myProfile?.onboarded || !wishlistsReady) return;
    if (seededWishlists.current) return;
    if (wishlists.some(w => w.owner.toHexString() === myHex)) {
      seededWishlists.current = true;
      return;
    }
    seededWishlists.current = true;
    [
      { name: 'Fav Date Night Spots', color: '#f6c6c6' },
      { name: 'Best Pasta in NYC', color: '#f7e3a1' },
      { name: 'Jazz Bars', color: '#f6cbb4' },
      { name: 'Hidden Parks', color: '#f3d9c0' },
    ].forEach(d => createWishlist(d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, identity, myProfile, wishlistsReady, wishlists, myHex]);

  // Candidate set the recommender ranks (our seeded spots only).
  const candidates = useMemo<Candidate[]>(
    () =>
      spots.map(s => {
        const comp = compositeMap.get(s.id);
        const info = placeInfoFor(s.name);
        return {
          id: s.id,
          name: s.name,
          category: s.category,
          lat: s.latitude,
          lng: s.longitude,
          price: priceLevel(info.price),
          tags: info.tags ?? [],
          blurb: info.blurb ?? '',
          busyness: comp && comp.count > 0 ? Math.round(comp.score) : null,
          waitMinutes: waitBySpot.get(s.id)?.minutes ?? null,
        };
      }),
    [spots, compositeMap, waitBySpot]
  );

  // Card view-models for the carousel.
  const recCards = useMemo<RecCard[]>(
    () =>
      recs.map(r => ({
        id: r.id,
        name: r.name,
        category: r.category,
        priceLabel: r.price ? '$'.repeat(r.price) : '',
        busyness: r.busyness,
        busynessLabel: r.busyness != null ? STATUS_META[scoreToLabel(r.busyness)].label : null,
        color: r.busyness != null ? scoreToColor(r.busyness) : NO_DATA_COLOR,
        distance: distanceLabel(r.distanceMeters),
        waitMinutes: r.waitMinutes,
        thumb: photoMap.get(r.id)?.[0]?.data ?? null,
      })),
    [recs, photoMap]
  );

  const selectedSpot = selectedId != null ? spotsById.get(selectedId) ?? null : null;
  // What the map pans to / highlights: an open detail OR a focused rec card.
  const mapHighlightId = selectedId ?? focusId;
  const mapPanSpot =
    selectedSpot ?? (focusId != null ? spotsById.get(focusId) ?? null : null);

  const resetDraft = () => {
    setChoice(null);
    setNote('');
    setWaitChoice(null);
  };
  const selectSpot = (id: bigint) => {
    setSelectedId(id);
    setFocusId(null);
    resetDraft();
    setSheetOpen(true);
  };
  const closeReport = () => {
    setSelectedId(null);
    resetDraft();
  };

  // Recommend: ask the LLM (via /api/recommend) for filters, then rank our spots.
  // Always returns something — falls back to busyness + distance on any failure.
  const runRecommend = async (query: string) => {
    setRecsLoading(true);
    setFocusId(null);
    let filters = EMPTY_FILTERS;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      const r = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (r.ok) {
        const data = await r.json();
        if (data?.filters) filters = data.filters;
      }
    } catch {
      /* network/timeout — keep EMPTY_FILTERS (busyness + distance fallback) */
    }
    setRecs(rankCandidates(candidates, filters, userLoc.coords, 6));
    setRecsLoading(false);
  };
  const focusRec = (id: bigint) => {
    setFocusId(id);
    setSelectedId(null);
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
    flashToast({ label: 'Vibe dropped.', status, venue: selectedSpot.name });
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
  const windowReports = selectedReports.filter(
    r => now - tsToMs(r.createdAt) <= COMPOSITE_WINDOW_MS
  );
  const selectedComposite: Composite =
    (selectedId != null ? compositeMap.get(selectedId) : undefined) ?? { score: 0, weight: 0, count: 0 };
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
      composite={selectedComposite}
      windowReports={windowReports}
      resolveHandle={resolveHandle}
      confirmFor={id => confirmsByReport.get(id) ?? 0}
      onConfirm={id => confirmReport({ reportId: id })}
      now={now}
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
      hideHeader
      onCheckIn={() =>
        flashToast({ label: 'Checked in.', status: null, venue: selectedSpot.name })
      }
    />
  ) : null;

  const selInfo = selectedSpot ? placeInfoFor(selectedSpot.name) : null;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden" style={{ background: 'var(--ink-900)' }}>
      {view === 'explore' && (
        <div className="relative h-full w-full">
          <MapView
            spots={visibleSpots}
            latestBySpot={latestBySpot}
            compositeBySpot={compositeMap}
            waitBySpot={waitBySpot}
            userCoords={userLoc.coords}
            userIsReal={userLoc.isReal}
            now={now}
            selectedId={mapHighlightId}
            selectedSpot={mapPanSpot}
            onSelect={selectSpot}
            panOnSelect
          />

          <Toast
            show={!!toast}
            label={toast?.label ?? 'Saved.'}
            status={toast?.status ?? null}
            venue={toast?.venue ?? null}
          />

          {/* Floating top chrome */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-[1200] flex flex-col gap-2.5 px-3"
            style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}
          >
            <div className="pointer-events-auto flex items-center gap-2">
              <div style={{ flex: 1, minWidth: 0 }}>
                <SearchBar value={searchQuery} onChange={setSearchQuery} onClear={() => setSearchQuery('')} />
              </div>
              <ProfileChip
                name={myHandle ?? 'you'}
                avatar={myProfile?.avatar ?? ''}
                onClick={() => setView('profile')}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <TouristToggle value={touristMode} onChange={setTouristMode} />
              <div className="pointer-events-auto">
                <OnlinePill count={onlineUsers.length} />
              </div>
            </div>
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

          {/* Spot detail sheet, or the chatbox dock when nothing is selected */}
          {selectedSpot && reportPanel ? (
            <BottomSheet
              open={sheetOpen}
              onOpenChange={setSheetOpen}
              peek={
                <SpotPeek
                  spot={selectedSpot}
                  info={selInfo ?? {}}
                  isSaved={mySavedIds.has(selectedSpot.id)}
                  onToggleSave={() => toggleSaved({ spotId: selectedSpot.id })}
                  onClose={closeReport}
                />
              }
            >
              <div className="pt-1">{reportPanel}</div>
            </BottomSheet>
          ) : (
            <ChatPanel
              loading={recsLoading}
              recs={recCards}
              savedIds={mySavedIds}
              tripIds={myTripSpotIds}
              onSubmit={runRecommend}
              onClear={() => {
                setRecs([]);
                setFocusId(null);
              }}
              onPick={focusRec}
              onAddTrip={id => {
                addToTrip({ spotId: id });
                const sp = spotsById.get(id);
                flashToast({ label: 'Added to trip.', status: null, venue: sp?.name ?? '' });
              }}
              onSave={id => {
                toggleSaved({ spotId: id });
                const sp = spotsById.get(id);
                flashToast({ label: 'Saved.', status: null, venue: sp?.name ?? '' });
              }}
            />
          )}
        </div>
      )}

      {view === 'itinerary' &&
        (openWishlist ? (
          <WishlistDetail
            name={openWishlist.name}
            color={openWishlist.color}
            items={openWishlistItems}
            spots={allSpotsLite}
            alreadyIn={openWishlistSpotIds}
            onAdd={spotId => addToWishlist({ wishlistId: openWishlist.id, spotId })}
            onRemove={itemId => removeWishlistItem({ itemId })}
            onBack={() => setOpenWishlistId(null)}
          />
        ) : (
          <ItineraryScreen
            currentTrip={currentTrip}
            wishlists={myWishlists}
            pastTrips={pastTrips}
            onOpenWishlist={setOpenWishlistId}
            onRemoveStop={stopId => removeTripStop({ stopId })}
          />
        ))}

      {view === 'profile' && (
        <ProfileScreen
          handle={myHandle ?? 'you'}
          avatar={myProfile?.avatar ?? ''}
          neighborhood="New York"
          activity={myActivity}
          onEdit={() => setEditProfile(true)}
        />
      )}

      <NavBar
        value={view}
        onChange={t => {
          setView(t);
          setOpenWishlistId(null);
        }}
      />

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

function FactChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 13,
        color: 'var(--fg-2)',
        background: 'var(--ink-600)',
        border: '1px solid var(--line-1)',
        borderRadius: 'var(--radius-pill)',
        padding: '5px 12px',
        textTransform: 'capitalize',
      }}
    >
      {children}
    </span>
  );
}

// Thin cool→hot gradient bar with a marker at the composite score.
function HeatBar({ score }: { score: number }) {
  const ramp = [0, 20, 40, 60, 80, 100].map(scoreToColor).join(', ');
  return (
    <div style={{ position: 'relative', height: 10 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${ramp})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: `${Math.max(0, Math.min(100, score))}%`,
          width: 14,
          height: 14,
          borderRadius: 999,
          transform: 'translate(-50%, -50%)',
          background: '#fff',
          border: `3px solid ${scoreToColor(score)}`,
          boxShadow: '0 1px 4px rgba(20,22,35,0.3)',
        }}
      />
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
  composite,
  windowReports,
  resolveHandle,
  confirmFor,
  onConfirm,
  now,
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
  hideHeader,
  onCheckIn,
}: {
  spot: Spot;
  info: PlaceInfo;
  photos: Photo[];
  onOpenCamera: () => void;
  composite: Composite;
  windowReports: Report[];
  resolveHandle: (idHex: string) => string;
  confirmFor: (id: bigint) => number;
  onConfirm: (id: bigint) => void;
  now: number;
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
  hideHeader?: boolean;
  onCheckIn?: () => void;
}) {
  const [showWait, setShowWait] = useState(false);
  const noteNeedsVibe = note.trim() !== '' && !choice && windowReports.length === 0;
  const distribution = STATUSES.reduce(
    (acc, k) => {
      acc[k] = windowReports.filter(r => r.status === k).length;
      return acc;
    },
    { packed: 0, filling: 0, chill: 0, dead: 0 } as Record<Status, number>
  );
  return (
    <div className="flex flex-col" style={{ gap: 18 }}>
      {!hideHeader && (
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
      )}

      {/* quick facts */}
      <div className="flex flex-wrap items-center gap-2">
        <FactChip>{spot.category}</FactChip>
        {currentWait && <FactChip>~{currentWait.minutes} min wait</FactChip>}
        {info.price && <FactChip>{info.price}</FactChip>}
      </div>

      {/* live photos */}
      <div className="flex flex-col" style={{ gap: 8 }}>
        <span style={{ ...eyebrowStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            className="breathe"
            style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--status-packed)' }}
          />
          Live Photos
        </span>
        <PhotoStrip photos={photos} now={now} onAdd={onOpenCamera} />
      </div>

      <PlaceLinks
        website={info.website}
        directionsUrl={mapsDirectionsUrl(spot.latitude, spot.longitude)}
        mapsUrl={mapsSearchUrl(spot.name)}
      />
      <PlaceDetails blurb={info.blurb} tags={info.tags} />

      {/* check in / report wait */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          className="press"
          onClick={onCheckIn}
          style={{
            height: 48,
            borderRadius: 'var(--radius-lg)',
            border: '1px solid transparent',
            background: 'var(--accent-ink)',
            color: 'var(--fg-on-accent)',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          Check In
        </button>
        <button
          type="button"
          className="press"
          onClick={() => setShowWait(v => !v)}
          style={{
            height: 48,
            borderRadius: 'var(--radius-lg)',
            border: `1px solid ${showWait ? 'var(--line-pulse)' : 'var(--line-2)'}`,
            background: showWait ? 'var(--pulse-tint)' : 'var(--ink-700)',
            color: showWait ? 'var(--pulse)' : 'var(--fg-1)',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Report Wait
        </button>
      </div>
      {showWait && (
        <div className="flex flex-col" style={{ gap: 8 }}>
          <span style={{ ...eyebrowStyle, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Clock size={12} /> How long's the wait?
          </span>
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
                    background: active ? 'var(--pulse-tint)' : 'var(--ink-600)',
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
      )}

      {/* composite busyness — derived from all reports in the last 2h */}
      <CompositeHeader
        score={composite.score}
        count={composite.count}
        weight={composite.weight}
        waitMinutes={currentWait ? currentWait.minutes : null}
      />
      {composite.count > 0 && <HeatBar score={composite.score} />}
      <DistributionBar counts={distribution} />

      {/* report history (newest first, 2h window) */}
      {windowReports.length > 0 && (
        <div className="flex flex-col" style={{ gap: 8 }}>
          <span style={eyebrowStyle}>Recent reports</span>
          <History
            reports={windowReports}
            now={now}
            resolveHandle={resolveHandle}
            confirmFor={confirmFor}
            onConfirm={onConfirm}
          />
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

      {/* save */}
      <PulseButton disabled={!canSave} onClick={onSave}>
        Post
      </PulseButton>
      {noteNeedsVibe && (
        <span style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: -10 }}>
          Pick a vibe to post this spot's first note.
        </span>
      )}
    </div>
  );
}

// Quiet→Packed gradient legend — explains the pin colors (blue = quiet, red = packed).
function Legend() {
  const ramp = [0, 20, 40, 60, 80, 100].map(scoreToColor).join(', ');
  const label: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--fg-2)',
    letterSpacing: '0.01em',
  };
  return (
    <div
      className="pointer-events-auto self-start"
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        padding: '7px 12px',
        borderRadius: 'var(--radius-pill)',
        background: 'var(--glass-raised)',
        border: '1px solid var(--line-2)',
        backdropFilter: 'blur(var(--blur-control))',
        WebkitBackdropFilter: 'blur(var(--blur-control))',
      }}
    >
      <span style={label}>Quiet</span>
      <div
        style={{
          width: 96,
          height: 8,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${ramp})`,
        }}
      />
      <span style={label}>Packed</span>
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

// Compact spot header shown in the bottom-sheet peek (name + rating + actions).
function SpotPeek({
  spot,
  info,
  isSaved,
  onToggleSave,
  onClose,
}: {
  spot: Spot;
  info: PlaceInfo;
  isSaved: boolean;
  onToggleSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-0.5">
      <div className="min-w-0">
        <div
          style={{
            fontSize: 21,
            fontWeight: 800,
            color: 'var(--fg-1)',
            letterSpacing: '-0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {spot.name}
        </div>
        <div className="flex items-center" style={{ gap: 8, marginTop: 3, fontSize: 13, color: 'var(--fg-2)' }}>
          {info.rating != null && (
            <span style={{ color: 'var(--fg-1)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Star size={13} fill="var(--status-filling)" color="var(--status-filling)" />
              {info.rating}
              {info.ratingCount != null && (
                <span style={{ color: 'var(--fg-3)', fontWeight: 400 }}>
                  ({info.ratingCount.toLocaleString()})
                </span>
              )}
            </span>
          )}
          <span style={{ textTransform: 'capitalize' }}>· {spot.category}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleSave}
          aria-label={isSaved ? 'Remove from saved' : 'Save to list'}
          className="press grid place-items-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: isSaved ? 'var(--pulse-tint)' : 'var(--ink-600)',
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
  );
}

export default App;
