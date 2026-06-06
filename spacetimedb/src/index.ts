import { schema, table, t, SenderError } from 'spacetimedb/server';

// ---------------------------------------------------------------------------
// NYC Pulse — a live map of how busy places around Herald Square are right now.
//
// status is stored as a plain validated string (one of STATUSES below) rather
// than a t.enum, because STDB enums generate tagged-union types on the client
// ({ tag: 'packed' }) which make the pin-coloring logic clunky. We validate the
// value server-side instead, which is just as safe.
// ---------------------------------------------------------------------------

// NOTE: not exported — the STDB module loader treats every runtime named export
// as a reducer/lifecycle/view. The client defines its own copy of this list.
const STATUSES = ['packed', 'filling', 'chill', 'dead'] as const;

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

// A fixed place on the map (seeded once in `init`).
const spot = table(
  { name: 'spot', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    name: t.string(),
    latitude: t.f64(),
    longitude: t.f64(),
    category: t.string(),
  }
);

// A single "how busy is it" report from a user about a spot.
const report = table(
  { name: 'report', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    spotId: t.u64().index('btree'), // look up / group reports by spot
    reporter: t.identity(), // ctx.sender of the submitter
    status: t.string(), // one of STATUSES
    note: t.option(t.string()), // optional free-text note
    createdAt: t.timestamp().index('btree'), // server time of the report
  }
);

// Presence + identity. One row per identity that has ever connected.
const user = table(
  { name: 'user', public: true },
  {
    identity: t.identity().primaryKey(),
    handle: t.string(),
    online: t.bool(),
  }
);

// F8 — "Still accurate" confirmations of a report. One per identity per report.
const confirmation = table(
  { name: 'confirmation', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    reportId: t.u64().index('btree'), // which report is being confirmed
    confirmer: t.identity(),
    createdAt: t.timestamp(),
  }
);

// F9 — current wait time for a spot. One row per spot; newest replaces older.
// Auto-expires after 60 min (clients ignore rows older than that).
const waitTime = table(
  { name: 'wait_time', public: true },
  {
    spotId: t.u64().primaryKey(), // one current wait per spot
    minutes: t.u32(),
    reporter: t.identity(),
    createdAt: t.timestamp(),
  }
);

// User-dropped photo of a spot (captured live from the camera). Stored as a
// resized JPEG data URL; meant to be recent (clients surface the newest).
const photo = table(
  { name: 'photo', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    spotId: t.u64().index('btree'),
    photographer: t.identity(),
    data: t.string(), // resized JPEG data URL
    createdAt: t.timestamp().index('btree'),
  }
);

// User profile (lightweight): email/bio/avatar live here; the display name stays
// on `user.handle`. onboarded gates the first-run onboarding screen.
const profile = table(
  { name: 'profile', public: true },
  {
    identity: t.identity().primaryKey(),
    email: t.string(),
    bio: t.string(),
    avatar: t.string(), // resized data URL or ''
    savedPublic: t.bool(), // is this user's saved list public
    onboarded: t.bool(),
  }
);

// A user's saved/favorite spot.
const savedSpot = table(
  { name: 'saved_spot', public: true },
  {
    id: t.u64().primaryKey().autoInc(),
    owner: t.identity().index('btree'),
    spotId: t.u64().index('btree'),
    createdAt: t.timestamp(),
  }
);

const spacetimedb = schema({
  spot,
  report,
  user,
  confirmation,
  waitTime,
  photo,
  profile,
  savedSpot,
});
export default spacetimedb;

// ---------------------------------------------------------------------------
// Seed data — ~25 real places within ~1 mile of Herald Square (40.7484, -73.9879)
// ---------------------------------------------------------------------------

type Seed = { name: string; latitude: number; longitude: number; category: string };

const SEED_SPOTS: Seed[] = [
  { name: "Macy's Herald Square", latitude: 40.7509, longitude: -73.989, category: 'shopping' },
  { name: 'Empire State Building', latitude: 40.7484, longitude: -73.9857, category: 'landmark' },
  { name: 'Koreatown (32nd St)', latitude: 40.7476, longitude: -73.9866, category: 'food' },
  { name: 'Madison Square Garden', latitude: 40.7505, longitude: -73.9934, category: 'venue' },
  { name: 'Penn Station', latitude: 40.7506, longitude: -73.9935, category: 'transit' },
  { name: 'Bryant Park', latitude: 40.7536, longitude: -73.9832, category: 'park' },
  { name: 'NY Public Library', latitude: 40.7532, longitude: -73.9822, category: 'landmark' },
  { name: 'Times Square', latitude: 40.758, longitude: -73.9855, category: 'landmark' },
  { name: 'Madison Square Park', latitude: 40.7423, longitude: -73.9879, category: 'park' },
  { name: 'Eataly NYC Flatiron', latitude: 40.7421, longitude: -73.9897, category: 'food' },
  { name: 'Flatiron Building', latitude: 40.7411, longitude: -73.9897, category: 'landmark' },
  { name: 'Shake Shack (Madison Sq)', latitude: 40.7417, longitude: -73.9882, category: 'food' },
  { name: 'The Morgan Library', latitude: 40.7491, longitude: -73.9815, category: 'museum' },
  { name: 'Greeley Square', latitude: 40.7484, longitude: -73.9883, category: 'park' },
  { name: 'Manhattan Mall', latitude: 40.7497, longitude: -73.9889, category: 'shopping' },
  { name: 'The Pennsy Food Hall', latitude: 40.7505, longitude: -73.992, category: 'food' },
  { name: 'Ace Hotel Lobby', latitude: 40.7459, longitude: -73.9886, category: 'nightlife' },
  { name: 'Grand Central Terminal', latitude: 40.7527, longitude: -73.9772, category: 'transit' },
  { name: 'Rockefeller Center', latitude: 40.7587, longitude: -73.9787, category: 'landmark' },
  { name: 'St. Patrick’s Cathedral', latitude: 40.7585, longitude: -73.976, category: 'landmark' },
  { name: 'Union Square', latitude: 40.7359, longitude: -73.9911, category: 'park' },
  { name: 'Chelsea Market', latitude: 40.7424, longitude: -74.0061, category: 'food' },
  { name: 'Hudson Yards (Vessel)', latitude: 40.7538, longitude: -74.0021, category: 'shopping' },
  { name: 'The High Line (W 14th)', latitude: 40.748, longitude: -74.0048, category: 'park' },
  { name: 'Korilla / K-Town BBQ Row', latitude: 40.7472, longitude: -73.9862, category: 'food' },
];

// ---------------------------------------------------------------------------
// Lifecycle hooks
// ---------------------------------------------------------------------------

export const init = spacetimedb.init(ctx => {
  // Seed the fixed set of spots exactly once, on first publish.
  for (const s of SEED_SPOTS) {
    ctx.db.spot.insert({
      id: 0n, // autoInc assigns the real id
      name: s.name,
      latitude: s.latitude,
      longitude: s.longitude,
      category: s.category,
    });
  }
});

export const onConnect = spacetimedb.clientConnected(ctx => {
  const existing = ctx.db.user.identity.find(ctx.sender);
  if (existing) {
    // Returning user — flip them back online, keep their handle.
    ctx.db.user.identity.update({ ...existing, online: true });
  } else {
    // New identity — give them a throwaway handle they can change later.
    const suffix = ctx.random.integerInRange(1000, 9999);
    ctx.db.user.insert({
      identity: ctx.sender,
      handle: `anon-${suffix}`,
      online: true,
    });
  }
});

export const onDisconnect = spacetimedb.clientDisconnected(ctx => {
  const existing = ctx.db.user.identity.find(ctx.sender);
  if (existing) {
    ctx.db.user.identity.update({ ...existing, online: false });
  }
});

// ---------------------------------------------------------------------------
// Reducers
// ---------------------------------------------------------------------------

// Submit a busyness report for a spot. Client name: reducers.submitReport
export const submitReport = spacetimedb.reducer(
  { spotId: t.u64(), status: t.string(), note: t.string() },
  (ctx, { spotId, status, note }) => {
    if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
      throw new SenderError(
        `invalid status "${status}"; must be one of ${STATUSES.join(', ')}`
      );
    }
    if (!ctx.db.spot.id.find(spotId)) {
      throw new SenderError(`no spot with id ${spotId}`);
    }

    const trimmed = note.trim();
    ctx.db.report.insert({
      id: 0n,
      spotId,
      reporter: ctx.sender,
      status,
      note: trimmed.length > 0 ? trimmed.slice(0, 140) : undefined,
      createdAt: ctx.timestamp,
    });
  }
);

// Set the caller's display handle. Client name: reducers.setHandle
export const setHandle = spacetimedb.reducer(
  { name: t.string() },
  (ctx, { name }) => {
    const handle = name.trim().slice(0, 24);
    if (handle.length === 0) {
      throw new SenderError('handle cannot be empty');
    }
    const existing = ctx.db.user.identity.find(ctx.sender);
    if (existing) {
      ctx.db.user.identity.update({ ...existing, handle });
    } else {
      // Reducer can be called before the connect handler in rare races — be safe.
      ctx.db.user.insert({ identity: ctx.sender, handle, online: true });
    }
  }
);

// F8 — confirm a report is still accurate (idempotent per identity).
// Client name: reducers.confirmReport
export const confirmReport = spacetimedb.reducer(
  { reportId: t.u64() },
  (ctx, { reportId }) => {
    if (!ctx.db.report.id.find(reportId)) {
      throw new SenderError(`no report with id ${reportId}`);
    }
    for (const c of ctx.db.confirmation.reportId.filter(reportId)) {
      if (c.confirmer.equals(ctx.sender)) return; // already confirmed — no-op
    }
    ctx.db.confirmation.insert({
      id: 0n,
      reportId,
      confirmer: ctx.sender,
      createdAt: ctx.timestamp,
    });
  }
);

// F9 — report a wait time (minutes) for a spot; newest replaces older.
// Client name: reducers.reportWait
export const reportWait = spacetimedb.reducer(
  { spotId: t.u64(), minutes: t.u32() },
  (ctx, { spotId, minutes }) => {
    if (!ctx.db.spot.id.find(spotId)) {
      throw new SenderError(`no spot with id ${spotId}`);
    }
    if (minutes > 600) {
      throw new SenderError('wait time too large');
    }
    const existing = ctx.db.waitTime.spotId.find(spotId);
    if (existing) {
      ctx.db.waitTime.spotId.update({
        spotId,
        minutes,
        reporter: ctx.sender,
        createdAt: ctx.timestamp,
      });
    } else {
      ctx.db.waitTime.insert({
        spotId,
        minutes,
        reporter: ctx.sender,
        createdAt: ctx.timestamp,
      });
    }
  }
);

// Onboard / edit profile: sets display name (user.handle) + email/bio/avatar.
// Client name: reducers.setProfile
export const setProfile = spacetimedb.reducer(
  { name: t.string(), email: t.string(), bio: t.string(), avatar: t.string() },
  (ctx, { name, email, bio, avatar }) => {
    if (avatar.length > 400_000) {
      throw new SenderError('avatar too large');
    }
    const handle = name.trim().slice(0, 24) || `anon-${ctx.random.integerInRange(1000, 9999)}`;
    const u = ctx.db.user.identity.find(ctx.sender);
    if (u) ctx.db.user.identity.update({ ...u, handle });
    else ctx.db.user.insert({ identity: ctx.sender, handle, online: true });

    const p = ctx.db.profile.identity.find(ctx.sender);
    const next = {
      email: email.trim().slice(0, 120),
      bio: bio.trim().slice(0, 200),
      avatar,
    };
    if (p) ctx.db.profile.identity.update({ ...p, ...next });
    else
      ctx.db.profile.insert({
        identity: ctx.sender,
        ...next,
        savedPublic: false,
        onboarded: true,
      });
  }
);

// Toggle whether the caller's saved list is public. Client: reducers.setSavedPublic
export const setSavedPublic = spacetimedb.reducer(
  { isPublic: t.bool() },
  (ctx, { isPublic }) => {
    const p = ctx.db.profile.identity.find(ctx.sender);
    if (p) ctx.db.profile.identity.update({ ...p, savedPublic: isPublic });
    else
      ctx.db.profile.insert({
        identity: ctx.sender,
        email: '',
        bio: '',
        avatar: '',
        savedPublic: isPublic,
        onboarded: false,
      });
  }
);

// Save/unsave a spot (toggle). Client: reducers.toggleSaved
export const toggleSaved = spacetimedb.reducer(
  { spotId: t.u64() },
  (ctx, { spotId }) => {
    if (!ctx.db.spot.id.find(spotId)) {
      throw new SenderError(`no spot with id ${spotId}`);
    }
    for (const s of ctx.db.savedSpot.spotId.filter(spotId)) {
      if (s.owner.equals(ctx.sender)) {
        ctx.db.savedSpot.id.delete(s.id);
        return;
      }
    }
    ctx.db.savedSpot.insert({ id: 0n, owner: ctx.sender, spotId, createdAt: ctx.timestamp });
  }
);

// Drop a freshly-captured photo of a spot. data is a resized JPEG data URL.
// Client name: reducers.addPhoto
export const addPhoto = spacetimedb.reducer(
  { spotId: t.u64(), data: t.string() },
  (ctx, { spotId, data }) => {
    if (!ctx.db.spot.id.find(spotId)) {
      throw new SenderError(`no spot with id ${spotId}`);
    }
    if (!data.startsWith('data:image/') || data.length < 100) {
      throw new SenderError('invalid image data');
    }
    if (data.length > 400_000) {
      throw new SenderError('image too large');
    }
    ctx.db.photo.insert({
      id: 0n,
      spotId,
      photographer: ctx.sender,
      data,
      createdAt: ctx.timestamp,
    });
  }
);
