import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { tables, reducers } from './module_bindings';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';
import { Camera, Check, ChevronLeft, Clock, Heart, Plus, Star, Video, X } from 'lucide-react';
import type { Report, Spot } from './module_bindings/types';
import MapView from './MapView';
import BottomSheet from './components/BottomSheet';
import { useGeolocation } from './lib/useGeolocation';
import {
  CategoryChips,
  DemoCommentList,
  History,
  OnlinePill,
  PhotoStrip,
  PlaceInfoCard,
  SearchBar,
  SearchResults,
  Toast,
  Wordmark,
  type SearchItem,
} from './components/pulse-ui';
import { demoCommentsFor } from './lib/demoComments';
import {
  ChatPanel,
  ItineraryScreen,
  MemberProfile,
  NavBar,
  PastItineraryDetail,
  ProfileScreen,
  TouristToggle,
  WishlistDetail,
  WishlistPicker,
  type ActivityItem,
  type CurrentTrip,
  type RecCard,
  type Tab,
} from './components/Screens';
import { PAST_ITINERARIES, MEMBERS, type PastItinerary } from './lib/demoTrips';
import CameraCapture from './components/CameraCapture';
import { Onboarding, ProfileEditModal } from './components/Profile';
import {
  rankCandidates,
  hasSignal,
  deriveFiltersFromQuery,
  haversineMeters,
  priceLevel,
  distanceLabel,
  EMPTY_FILTERS,
  type Candidate,
  type Filters,
  type Ranked,
} from './lib/recommend';
import { placeInfoFor, type PlaceInfo } from './placeInfo';
import { venueCover, venuePhotos } from './lib/venuePhoto';
import { computeWrapped } from './lib/wrapped';
import { WrappedCard } from './components/Wrapped';
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
  const [profileExtras] = useTable(tables.profileExtra);
  const [tripStops] = useTable(tables.tripStop);
  const [trips] = useTable(tables.trip);
  const [archivedTrips] = useTable(tables.archivedTrip);
  const [wishlists, wishlistsReady] = useTable(tables.wishlist);
  const [wishlistItems] = useTable(tables.wishlistItem);

  const submitReport = useReducer(reducers.submitReport);
  const deleteReport = useReducer(reducers.deleteReport);
  const confirmReport = useReducer(reducers.confirmReport);
  const reportWait = useReducer(reducers.reportWait);
  const deleteWait = useReducer(reducers.deleteWait);
  const addPhoto = useReducer(reducers.addPhoto);
  const deletePhoto = useReducer(reducers.deletePhoto);
  const archiveTrip = useReducer(reducers.archiveTrip);
  const setProfile = useReducer(reducers.setProfile);
  const setContact = useReducer(reducers.setContact);
  const addToTrip = useReducer(reducers.addToTrip);
  const removeTripStop = useReducer(reducers.removeTripStop);
  const reorderTripStops = useReducer(reducers.reorderTripStops);
  const createWishlist = useReducer(reducers.createWishlist);
  const createWishlistWithSpot = useReducer(reducers.createWishlistWithSpot);
  const addToWishlist = useReducer(reducers.addToWishlist);
  const removeWishlistItem = useReducer(reducers.removeWishlistItem);
  const renameWishlist = useReducer(reducers.renameWishlist);
  const deleteWishlist = useReducer(reducers.deleteWishlist);

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
  const [openPastId, setOpenPastId] = useState<string | null>(null);
  const [openMemberId, setOpenMemberId] = useState<string | null>(null);
  const [wishlistPickerSpotId, setWishlistPickerSpotId] = useState<bigint | null>(null);
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [followedMembers, setFollowedMembers] = useState<Set<string>>(new Set());
  const [tripShareMembers, setTripShareMembers] = useState<Set<string>>(new Set());
  const allPeople = useMemo(
    () =>
      Object.values(MEMBERS).map(m => ({
        id: m.id,
        name: m.name,
        handle: m.handle,
        initials: m.initials,
        color: m.color,
      })),
    []
  );
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
  // Stable, unique index per spot (sorted by name) → each venue gets a unique
  // stock cover so no two previews look identical.
  const spotPhotoIndex = useMemo(() => {
    const m = new Map<bigint, number>();
    [...spots].sort((a, b) => a.name.localeCompare(b.name)).forEach((s, i) => m.set(s.id, i));
    return m;
  }, [spots]);
  const latestBySpot = useMemo(() => latestReportBySpot(reports), [reports]);
  const resolveHandle = useMemo(() => handleFor(users), [users]);

  // F8 confirmations per report + F9 current wait per spot.
  const confirmsByReport = useMemo(() => confirmCountsByReport(confirmations), [confirmations]);
  const myConfirmedReports = useMemo(() => {
    const hex = identity?.toHexString() ?? '';
    return new Set(confirmations.filter(c => c.confirmer.toHexString() === hex).map(c => c.reportId));
  }, [confirmations, identity]);
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
    () =>
      spots.filter(
        s =>
          !hiddenCats.has(s.category) &&
          // Locals skip the tourist landmarks.
          !(touristMode === 'local' && s.category.toLowerCase() === 'landmark')
      ),
    [spots, hiddenCats, touristMode]
  );

  // Search across ALL spots (ignores category filter) with status/wait/heat.
  const searchItems = useMemo<SearchItem[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const places: SearchItem[] = spots
      .filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
      .map(s => {
        const latest = latestBySpot.get(s.id);
        const fresh = !!latest && now - tsToMs(latest.createdAt) <= STALE_MS;
        return {
          kind: 'place' as const,
          key: `p${s.id.toString()}`,
          placeId: s.id,
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
    const people: SearchItem[] = allPeople
      .filter(p => p.name.toLowerCase().includes(q) || p.handle.toLowerCase().includes(q))
      .slice(0, 4)
      .map(p => ({
        kind: 'person' as const,
        key: `u${p.id}`,
        personId: p.id,
        name: p.name,
        category: '@' + p.handle.replace(/^@/, ''),
        status: 'stale' as const,
        waitMinutes: null,
        color: p.color,
        initials: p.initials,
      }));
    return [...places, ...people];
  }, [searchQuery, spots, latestBySpot, waitBySpot, now, allPeople]);

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
  const myExtra = useMemo(
    () => profileExtras.find(p => p.identity.toHexString() === myHex),
    [profileExtras, myHex]
  );
  // "Your NYC, Wrapped" — deterministic stats from my reports + the spots I touched.
  const wrappedStats = useMemo(
    () =>
      computeWrapped({
        myReports: reports
          .filter(r => r.reporter.toHexString() === myHex)
          .map(r => ({ spotId: r.spotId, status: r.status as Status, at: tsToMs(r.createdAt) })),
        spotsById,
        allReports: reports.map(r => ({ reporterHex: r.reporter.toHexString(), spotId: r.spotId })),
        myHex,
      }),
    [reports, spotsById, myHex]
  );

  // A spot is "favorited" if it's in any of my wishlist categories.
  const mySavedIds = useMemo(
    () => new Set(wishlistItems.filter(i => i.owner.toHexString() === myHex).map(i => i.spotId)),
    [wishlistItems, myHex]
  );
  // Profile "Activity": my own vibes + photos, newest first.
  const myActivity = useMemo<ActivityItem[]>(() => {
    const vibes = reports
      .filter(r => r.reporter.toHexString() === myHex)
      .map(r => ({
        id: `r${r.id.toString()}`,
        kind: 'vibe' as const,
        targetId: r.id,
        spotName: spotsById.get(r.spotId)?.name ?? 'Spot',
        note: r.note ?? '',
        status: r.status as Status,
        thumb: undefined as string | undefined,
        at: tsToMs(r.createdAt),
      }));
    const pics = photos
      .filter(p => p.photographer.toHexString() === myHex)
      .map(p => ({
        id: `p${p.id.toString()}`,
        kind: 'photo' as const,
        targetId: p.id,
        spotName: spotsById.get(p.spotId)?.name ?? 'Spot',
        note: '',
        status: 'packed' as Status,
        thumb: p.data,
        at: tsToMs(p.createdAt),
      }));
    const myWaits = waits
      .filter(w => w.reporter.toHexString() === myHex)
      .map(w => ({
        id: `w${w.spotId.toString()}`,
        kind: 'wait' as const,
        targetId: w.spotId,
        spotName: spotsById.get(w.spotId)?.name ?? 'Spot',
        note: '',
        status: 'filling' as Status,
        thumb: undefined as string | undefined,
        minutes: w.minutes,
        at: tsToMs(w.createdAt),
      }));
    return [...vibes, ...pics, ...myWaits]
      .sort((a, b) => b.at - a.at)
      .slice(0, 40)
      .map(x => ({
        id: x.id,
        kind: x.kind,
        targetId: x.targetId,
        spotName: x.spotName,
        note: x.note,
        status: x.status,
        thumb: x.thumb,
        minutes: 'minutes' in x ? x.minutes : undefined,
        ageMs: now - x.at,
      }));
  }, [reports, photos, waits, myHex, spotsById, now]);

  // The LIVE itinerary = my newest trip that hasn't been archived to history.
  // "Added" state + add/remove toggles must target ONLY this trip (never a past one).
  const liveTripId = useMemo(() => {
    const archived = new Set(
      archivedTrips.filter(a => a.owner.toHexString() === myHex).map(a => a.tripId)
    );
    const live = [...trips]
      .filter(t => t.owner.toHexString() === myHex && !archived.has(t.id))
      .sort((a, b) => tsToMs(b.createdAt) - tsToMs(a.createdAt))[0];
    return live?.id ?? null;
  }, [trips, archivedTrips, myHex]);
  const liveStops = useMemo(
    () => (liveTripId == null ? [] : tripStops.filter(s => s.tripId === liveTripId)),
    [tripStops, liveTripId]
  );
  const myTripSpotIds = useMemo(() => new Set(liveStops.map(s => s.spotId)), [liveStops]);
  // spotId → its stop id on the live trip (for the un-add toggle).
  const tripStopIdBySpot = useMemo(() => {
    const m = new Map<bigint, bigint>();
    for (const s of liveStops) if (!m.has(s.spotId)) m.set(s.spotId, s.id);
    return m;
  }, [liveStops]);

  // ---- Itinerary tab data ----
  const archivedTripIds = useMemo(
    () => new Set(archivedTrips.filter(a => a.owner.toHexString() === myHex).map(a => a.tripId)),
    [archivedTrips, myHex]
  );
  const myTrips = useMemo(
    () =>
      [...trips]
        .filter(t => t.owner.toHexString() === myHex)
        .sort((a, b) => tsToMs(b.createdAt) - tsToMs(a.createdAt)),
    [trips, myHex]
  );
  const activeTrips = useMemo(() => myTrips.filter(t => !archivedTripIds.has(t.id)), [myTrips, archivedTripIds]);
  const currentTripData = useMemo(() => {
    const active = activeTrips[0];
    if (!active) return { vm: null as CurrentTrip | null, spotIds: [] as bigint[], tripId: null as bigint | null };
    const ordered = [...tripStops]
      .filter(s => s.tripId === active.id)
      .sort((a, b) => {
        const dt = tsToMs(a.createdAt) - tsToMs(b.createdAt);
        if (dt !== 0) return dt;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
    const initials =
      (myHandle ?? 'You')
        .split(/[\s_]+/)
        .map(w => w[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'YOU';
    const dateLabel = `Tonight · ${new Date(
      Number(active.createdAt.microsSinceUnixEpoch / 1000n)
    ).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    const vm: CurrentTrip = {
      name: active.name,
      dateLabel,
      members: [
        { initials, color: '#e0556b', avatar: myProfile?.avatar || undefined },
        ...[...tripShareMembers]
          .map(id => MEMBERS[id])
          .filter(Boolean)
          .map(m => ({ initials: m.initials, color: m.color })),
      ],
      stops: ordered.map(s => ({
        id: s.id,
        spotId: s.spotId,
        name: spotsById.get(s.spotId)?.name ?? 'Spot',
      })),
    };
    return { vm, spotIds: ordered.map(s => s.spotId), tripId: active.id };
  }, [activeTrips, tripStops, spotsById, myHandle, myProfile, tripShareMembers]);
  const currentTrip = currentTripData.vm;
  // Real archived trips → past-itinerary cards (newest first).
  const archivedItineraries = useMemo<PastItinerary[]>(() => {
    const byTime = [...archivedTrips]
      .filter(a => a.owner.toHexString() === myHex)
      .sort((a, b) => tsToMs(b.createdAt) - tsToMs(a.createdAt));
    return byTime
      .map(a => {
        const tr = trips.find(t => t.id === a.tripId);
        if (!tr) return null;
        const stops = [...tripStops]
          .filter(s => s.tripId === tr.id)
          .sort((x, y) => tsToMs(x.createdAt) - tsToMs(y.createdAt))
          .map((s, i) => ({
            name: spotsById.get(s.spotId)?.name ?? 'Spot',
            time: '',
            walk: i === 0 ? 'Start here' : 'next stop',
          }));
        return {
          id: `arch-${tr.id.toString()}`,
          name: tr.name,
          date: new Date(Number(tr.createdAt.microsSinceUnixEpoch / 1000n)).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          }),
          members: [],
          stops,
        } as PastItinerary;
      })
      .filter((x): x is PastItinerary => !!x);
  }, [archivedTrips, trips, tripStops, spotsById, myHex]);
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
  const openPastItinerary =
    openPastId != null
      ? [...archivedItineraries, ...PAST_ITINERARIES].find(i => i.id === openPastId) ?? null
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
        // a live user photo if one exists, else a reliable category stock photo
        thumb: photoMap.get(r.id)?.[0]?.data ?? venueCover(spotPhotoIndex.get(r.id) ?? 0),
      })),
    [recs, photoMap, spotPhotoIndex]
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

    // The places the LLM gets to choose from ARE our live browser data: every
    // spot with its category, tags, live busyness (composite) and distance.
    const places = candidates.map((c, i) => ({
      i,
      name: c.name,
      cat: c.category,
      tags: c.tags.slice(0, 4),
      busy: c.busyness != null ? Math.round(c.busyness) : null,
      dist: Math.round(haversineMeters(userLoc.coords, [c.lat, c.lng])),
    }));

    let picks: number[] | null = null;
    let filters: Filters = EMPTY_FILTERS;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      const r = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, places }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (r.ok) {
        const data = await r.json();
        if (Array.isArray(data?.picks)) picks = data.picks;
        if (data?.filters) filters = data.filters;
      }
    } catch {
      /* network/timeout — fall through to client-side ranking of browser data */
    }

    if (picks && picks.length) {
      // LLM chose from our live data — render its order directly.
      const byIndex = picks.map(i => candidates[i]).filter(Boolean);
      setRecs(byIndex.map(c => ({ ...c, distanceMeters: haversineMeters(userLoc.coords, [c.lat, c.lng]) })));
    } else {
      // LLM unavailable → parse the query client-side and rank our spots locally.
      if (!hasSignal(filters)) filters = deriveFiltersFromQuery(query);
      setRecs(rankCandidates(candidates, filters, userLoc.coords, 6));
    }
    setRecsLoading(false);
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
          <p className="breathe" style={{ fontSize: 14, color: 'var(--pulse)', fontWeight: 600 }}>
            tuning into the city…
          </p>
        </div>
      </div>
    );
  }
  if (identity && !myProfile?.onboarded) {
    return (
      <Onboarding
        initial={{ name: '', email: '', bio: '', avatar: '', phone: '', gender: '', location: '' }}
        onComplete={v => {
          setProfile({ name: v.name, email: v.email, bio: v.bio, avatar: v.avatar });
          setContact({ phone: v.phone, gender: v.gender, location: v.location });
        }}
      />
    );
  }

  const selLatest = selectedReports[0];
  const windowReports = selectedReports.filter(
    r => now - tsToMs(r.createdAt) <= COMPOSITE_WINDOW_MS
  );
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
      photoFiller={venuePhotos(spotPhotoIndex.get(selectedSpot.id) ?? 0, 5)}
      onOpenCamera={() => setCameraOpen(true)}
      windowReports={windowReports}
      resolveHandle={resolveHandle}
      confirmFor={id => confirmsByReport.get(id) ?? 0}
      confirmedByMe={id => myConfirmedReports.has(id)}
      onConfirm={id => confirmReport({ reportId: id })}
      now={now}
      waitMinutes={waitChoice ?? curWaitMin}
      onPickWait={m => {
        setWaitChoice(m);
        // Reporting a wait commits immediately (and shows up in your Activity).
        if (selectedId != null && selectedSpot) {
          reportWait({ spotId: selectedId, minutes: m });
          flashToast({
            label: m === 0 ? 'Reported no wait.' : `Reported ~${m}m wait.`,
            status: null,
            venue: selectedSpot.name,
          });
        }
      }}
      choice={choice}
      onToggleVibe={toggleChoice}
      note={note}
      setNote={setNote}
      canSave={canSave}
      onSave={onSave}
      onClose={closeReport}
      hideHeader
      onCheckIn={() => {
        flashToast({ label: 'Checked in.', status: null, venue: selectedSpot.name });
        const idx = currentTripData.spotIds.findIndex(id => id === selectedId);
        if (idx >= 0) setActiveStopIndex(idx);
      }}
      myHex={myHex}
      onDeletePhoto={photoId => deletePhoto({ photoId })}
    />
  ) : null;

  const selInfo = selectedSpot ? placeInfoFor(selectedSpot.name) : null;
  // Which of my wishlists contain the selected spot (+ the item id, for removal).
  const selWishlistItemByList = new Map<bigint, bigint>();
  if (selectedId != null) {
    for (const it of wishlistItems) {
      if (it.spotId === selectedId && it.owner.toHexString() === myHex) {
        selWishlistItemByList.set(it.wishlistId, it.id);
      }
    }
  }
  const selInWishlists = new Set(selWishlistItemByList.keys());

  // Wishlist membership for whichever spot the favorite picker is open on.
  const pickerSpot = wishlistPickerSpotId != null ? spotsById.get(wishlistPickerSpotId) ?? null : null;
  const pickerItemByList = new Map<bigint, bigint>();
  if (wishlistPickerSpotId != null) {
    for (const it of wishlistItems) {
      if (it.spotId === wishlistPickerSpotId && it.owner.toHexString() === myHex) {
        pickerItemByList.set(it.wishlistId, it.id);
      }
    }
  }

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
                onPickPlace={id => {
                  selectSpot(id);
                  setSearchQuery('');
                }}
                onPickPerson={pid => {
                  setOpenWishlistId(null);
                  setOpenPastId(null);
                  setOpenMemberId(pid);
                  setView('itinerary');
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
                  hearted={selInWishlists.size > 0}
                  onOpenWishlist={() => {
                    if (selectedId != null) setWishlistPickerSpotId(selectedId);
                  }}
                  isInTrip={selectedId != null && myTripSpotIds.has(selectedId)}
                  onAddToTrip={() => {
                    if (selectedId == null) return;
                    const stopId = tripStopIdBySpot.get(selectedId);
                    if (stopId != null) {
                      removeTripStop({ stopId });
                      flashToast({ label: 'Removed from itinerary.', status: null, venue: selectedSpot.name });
                    } else {
                      addToTrip({ spotId: selectedId });
                      flashToast({ label: 'Added to itinerary.', status: null, venue: selectedSpot.name });
                    }
                  }}
                  onBack={recCards.length > 0 ? closeReport : undefined}
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
              onPick={selectSpot}
              onAddTrip={id => {
                const sp = spotsById.get(id);
                const stopId = tripStopIdBySpot.get(id);
                if (stopId != null) {
                  removeTripStop({ stopId });
                  flashToast({ label: 'Removed from itinerary.', status: null, venue: sp?.name ?? '' });
                } else {
                  addToTrip({ spotId: id });
                  flashToast({ label: 'Added to itinerary.', status: null, venue: sp?.name ?? '' });
                }
              }}
              onSave={id => setWishlistPickerSpotId(id)}
            />
          )}
        </div>
      )}

      {view === 'itinerary' &&
        (openMemberId && MEMBERS[openMemberId] ? (
          <MemberProfile
            member={MEMBERS[openMemberId]}
            isFollowing={followedMembers.has(openMemberId)}
            onToggleFollow={() =>
              setFollowedMembers(prev => {
                const next = new Set(prev);
                if (next.has(openMemberId)) next.delete(openMemberId);
                else next.add(openMemberId);
                return next;
              })
            }
            onBack={() => setOpenMemberId(null)}
          />
        ) : openPastItinerary ? (
          <PastItineraryDetail
            itinerary={openPastItinerary}
            onOpenMember={setOpenMemberId}
            onBack={() => setOpenPastId(null)}
          />
        ) : openWishlist ? (
          <WishlistDetail
            name={openWishlist.name}
            color={openWishlist.color}
            items={openWishlistItems}
            spots={allSpotsLite}
            alreadyIn={openWishlistSpotIds}
            onAdd={spotId => addToWishlist({ wishlistId: openWishlist.id, spotId })}
            onRemove={itemId => removeWishlistItem({ itemId })}
            onBack={() => setOpenWishlistId(null)}
            onRename={name => renameWishlist({ wishlistId: openWishlist.id, name })}
            onDelete={() => {
              deleteWishlist({ wishlistId: openWishlist.id });
              setOpenWishlistId(null);
            }}
          />
        ) : (
          <ItineraryScreen
            currentTrip={currentTrip}
            wishlists={myWishlists}
            activeStopIndex={activeStopIndex}
            people={allPeople}
            sharedMemberIds={tripShareMembers}
            onToggleShareMember={id =>
              setTripShareMembers(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onOpenWishlist={setOpenWishlistId}
            onCreateWishlist={name =>
              createWishlist({
                name,
                color: WISHLIST_COLORS[myWishlists.length % WISHLIST_COLORS.length],
              })
            }
            onOpenPast={setOpenPastId}
            onRemoveStop={stopId => removeTripStop({ stopId })}
            onReorderStops={ids => reorderTripStops({ orderedStopIds: ids })}
            onOpenStop={spotId => {
              setOpenWishlistId(null);
              setOpenPastId(null);
              setOpenMemberId(null);
              setView('explore');
              selectSpot(spotId);
            }}
            onArchive={() => {
              if (currentTripData.tripId != null) {
                archiveTrip({ tripId: currentTripData.tripId });
                flashToast({ label: 'Saved to past itineraries.', status: null, venue: '' });
              }
            }}
            extraPast={archivedItineraries}
          />
        ))}

      {view === 'profile' && (
        <ProfileScreen
          handle={myHandle ?? 'you'}
          avatar={myProfile?.avatar ?? ''}
          neighborhood={myExtra?.location?.trim() ? myExtra.location : 'New York'}
          bio={myProfile?.bio ?? ''}
          wrapped={<WrappedCard stats={wrappedStats} />}
          vibes={reports.filter(r => r.reporter.toHexString() === myHex).length}
          following={followedMembers.size}
          activity={myActivity}
          onEdit={() => setEditProfile(true)}
          onDeleteActivity={item => {
            if (item.kind === 'photo') deletePhoto({ photoId: item.targetId });
            else if (item.kind === 'wait') deleteWait({ spotId: item.targetId });
            else deleteReport({ reportId: item.targetId });
          }}
        />
      )}

      <NavBar
        value={view}
        onChange={t => {
          setView(t);
          setOpenWishlistId(null);
          setOpenPastId(null);
          setOpenMemberId(null);
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

      {wishlistPickerSpotId != null && pickerSpot && (
        <WishlistPicker
          spotName={pickerSpot.name}
          wishlists={myWishlists}
          inWishlists={new Set(pickerItemByList.keys())}
          onToggle={wid => {
            const itemId = pickerItemByList.get(wid);
            if (itemId != null) removeWishlistItem({ itemId });
            else addToWishlist({ wishlistId: wid, spotId: wishlistPickerSpotId });
          }}
          onCreate={name =>
            createWishlistWithSpot({
              name,
              color: WISHLIST_COLORS[myWishlists.length % WISHLIST_COLORS.length],
              spotId: wishlistPickerSpotId,
            })
          }
          onClose={() => setWishlistPickerSpotId(null)}
        />
      )}

      {editProfile && (
        <ProfileEditModal
          initial={{
            name: myHandle ?? '',
            email: myProfile?.email ?? '',
            bio: myProfile?.bio ?? '',
            avatar: myProfile?.avatar ?? '',
            phone: myExtra?.phone ?? '',
            gender: myExtra?.gender ?? '',
            location: myExtra?.location ?? '',
          }}
          onSave={v => {
            setProfile({ name: v.name, email: v.email, bio: v.bio, avatar: v.avatar });
            setContact({ phone: v.phone, gender: v.gender, location: v.location });
            setEditProfile(false);
          }}
          onClose={() => setEditProfile(false)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const WAIT_OPTIONS = [0, 5, 15, 30, 45, 60];

// Pastel bubble colors for new wishlists.
const WISHLIST_COLORS = ['#f6c6c6', '#f7e3a1', '#f6cbb4', '#f3d9bf', '#cfe7cf', '#cdd9f6', '#f0cfe6'];

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
  photoFiller,
  onOpenCamera,
  windowReports,
  resolveHandle,
  confirmFor,
  confirmedByMe,
  onConfirm,
  now,
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
  myHex,
  onDeletePhoto,
}: {
  spot: Spot;
  info: PlaceInfo;
  photos: Photo[];
  photoFiller: string[];
  onOpenCamera: () => void;
  windowReports: Report[];
  resolveHandle: (idHex: string) => string;
  confirmFor: (id: bigint) => number;
  confirmedByMe: (id: bigint) => boolean;
  onConfirm: (id: bigint) => void;
  now: number;
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
  myHex: string;
  onDeletePhoto: (photoId: bigint) => void;
}) {
  const [showWait, setShowWait] = useState(false);
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

      {/* live photos */}
      <div className="flex flex-col" style={{ gap: 8 }}>
        <div className="flex items-center justify-between">
          <span style={{ ...eyebrowStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span
              className="breathe"
              style={{ width: 7, height: 7, borderRadius: 999, background: 'var(--status-packed)' }}
            />
            Live Photos
          </span>
          <button
            type="button"
            onClick={onOpenCamera}
            className="press flex items-center"
            style={{
              gap: 6,
              height: 30,
              padding: '0 12px',
              borderRadius: 'var(--radius-pill)',
              background: 'var(--ink-600)',
              border: '1px solid var(--line-1)',
              color: 'var(--fg-1)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Camera size={15} /> Add photo
          </button>
        </div>
        <PhotoStrip
          photos={photos}
          filler={photoFiller}
          now={now}
          myHex={myHex}
          onDelete={onDeletePhoto}
        />
      </div>

      {/* place info — description, location, tags, website, hours */}
      <PlaceInfoCard info={info} />

      {/* check in / report wait */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          className="press"
          onClick={onCheckIn}
          style={{
            height: 52,
            borderRadius: 'var(--radius-lg)',
            border: '1px solid transparent',
            background: 'var(--accent-ink)',
            color: 'var(--fg-on-accent)',
            fontSize: 16,
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
            height: 52,
            borderRadius: 'var(--radius-lg)',
            border: `1px solid ${showWait ? 'var(--line-pulse)' : 'var(--line-2)'}`,
            background: showWait ? 'var(--pulse-tint)' : 'var(--ink-700)',
            color: showWait ? 'var(--pulse)' : 'var(--fg-1)',
            fontSize: 16,
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

      {/* report current status */}
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--fg-1)',
          paddingBottom: 10,
          borderBottom: '1px solid var(--line-1)',
        }}
      >
        Report current status
      </div>

      {/* vibe picker */}
      <div className="grid grid-cols-4 gap-2">
        {STATUSES.map(s => {
          const meta = STATUS_META[s];
          const on = choice === s;
          return (
            <button
              key={s}
              type="button"
              className="press"
              onClick={() => onToggleVibe(s)}
              style={{
                height: 36,
                borderRadius: 'var(--radius-pill)',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                background: on ? meta.color : meta.tint,
                border: `1px solid ${on ? meta.color : 'transparent'}`,
                color: on ? 'var(--fg-on-accent)' : meta.color,
              }}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* share the vibe input + Post */}
      <div
        className="flex items-center"
        style={{
          gap: 8,
          height: 48,
          padding: '0 6px 0 16px',
          borderRadius: 'var(--radius-pill)',
          background: 'var(--ink-600)',
          border: '1px solid var(--line-1)',
        }}
      >
        <input
          value={note}
          maxLength={140}
          onChange={e => setNote(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && canSave) onSave();
          }}
          placeholder="Share the vibe right now…"
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
          onClick={onSave}
          disabled={!canSave}
          className="press"
          style={{
            height: 36,
            padding: '0 18px',
            borderRadius: 'var(--radius-pill)',
            border: 'none',
            fontSize: 14,
            fontWeight: 700,
            cursor: canSave ? 'pointer' : 'default',
            background: canSave ? 'var(--accent-ink)' : 'var(--ink-400)',
            color: '#fff',
          }}
        >
          Post
        </button>
      </div>

      {/* photo / video */}
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" className="press" onClick={onOpenCamera} style={photoVideoBtn}>
          <Camera size={16} /> Photo
        </button>
        <button type="button" className="press" style={photoVideoBtn}>
          <Video size={16} /> Video
        </button>
      </div>
      <span style={{ fontSize: 12, color: 'var(--fg-3)', textAlign: 'center', marginTop: -4 }}>
        Disappears after 24 hours
      </span>

      {/* recent reports (real) + community comments (demo) */}
      <History
        reports={windowReports}
        now={now}
        resolveHandle={resolveHandle}
        confirmFor={confirmFor}
        confirmedByMe={confirmedByMe}
        onConfirm={onConfirm}
      />
      <DemoCommentList comments={demoCommentsFor(spot.name, spot.category)} />
    </div>
  );
}

const photoVideoBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  height: 46,
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--line-2)',
  background: 'var(--ink-700)',
  color: 'var(--fg-1)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

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
  hearted,
  onOpenWishlist,
  isInTrip,
  onAddToTrip,
  onBack,
  onClose,
}: {
  spot: Spot;
  info: PlaceInfo;
  hearted: boolean;
  onOpenWishlist: () => void;
  isInTrip: boolean;
  onAddToTrip: () => void;
  onBack?: () => void;
  onClose: () => void;
}) {
  const circle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 999,
    cursor: 'pointer',
  };
  return (
    <div className="flex items-start justify-between gap-3 py-0.5">
      <div className="flex min-w-0 items-start" style={{ gap: 8 }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to recommendations"
            className="press grid place-items-center shrink-0"
            style={{ ...circle, background: 'var(--ink-600)', border: '1px solid var(--line-1)', color: 'var(--fg-2)' }}
          >
            <ChevronLeft size={18} strokeWidth={2.4} />
          </button>
        )}
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
            {info.rating != null ? (
              <span style={{ color: 'var(--fg-1)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Star size={13} fill="var(--status-filling)" color="var(--status-filling)" />
                {info.rating}
                {info.ratingCount != null && (
                  <span style={{ color: 'var(--fg-3)', fontWeight: 400 }}>
                    ({info.ratingCount.toLocaleString()})
                  </span>
                )}
              </span>
            ) : (
              <span style={{ textTransform: 'capitalize' }}>{spot.category}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {/* heart → favorite to a wishlist category */}
        <button
          type="button"
          onClick={onOpenWishlist}
          aria-label="Favorite to a wishlist"
          className="press grid place-items-center"
          style={{
            ...circle,
            background: hearted ? 'var(--pulse-tint)' : 'var(--ink-600)',
            border: `1px solid ${hearted ? 'var(--line-pulse)' : 'var(--line-1)'}`,
            color: hearted ? 'var(--pulse)' : 'var(--fg-2)',
          }}
        >
          <Heart size={16} strokeWidth={2.2} fill={hearted ? 'var(--pulse)' : 'none'} />
        </button>

        {/* plus → add to itinerary */}
        <button
          type="button"
          onClick={onAddToTrip}
          aria-label={isInTrip ? 'In itinerary' : 'Add to itinerary'}
          title={isInTrip ? 'In your itinerary' : 'Add to itinerary'}
          className="press grid place-items-center"
          style={{
            ...circle,
            background: isInTrip ? 'var(--pulse-tint)' : 'var(--ink-600)',
            border: `1px solid ${isInTrip ? 'var(--line-pulse)' : 'var(--line-1)'}`,
            color: isInTrip ? 'var(--pulse)' : 'var(--fg-2)',
          }}
        >
          {isInTrip ? <Check size={16} strokeWidth={2.4} /> : <Plus size={16} strokeWidth={2.4} />}
        </button>

        {/* close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid place-items-center"
          style={{ ...circle, background: 'var(--ink-600)', border: '1px solid var(--line-1)', color: 'var(--fg-2)' }}
        >
          <X size={16} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}

export default App;
