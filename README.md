# Dionysus 
### Real-time NYC discovery — find what's alive in the city right now

> SpacetimeDB Launchpad Hackathon · NYC Tech Week · June 2026

**Live demo:** [nyc-pulse-two.vercel.app](https://nyc-pulse-two.vercel.app)

---

## What it is

Dionysus is a real-time NYC map app powered entirely by word of mouth. Every pin on the map reflects what people are saying *right now* — not Yelp reviews from six months ago. Users drop live vibes, report wait times, confirm what's still accurate, and plan itineraries together. The whole thing is collaborative, live, and built on SpacetimeDB.

Think Waze, but for finding out where to go on a Friday night in New York.

---

## The problem it solves

Google Maps tells you a restaurant has 4.2 stars. It does not tell you the line is currently 45 minutes, the DJ just started, or the place is completely empty on a Tuesday. Dionysus fills that gap with community-sourced real-time intelligence — the kind of information that only exists in a text message from a friend who's already there.

---

## Why SpacetimeDB

Every feature in Dionysus requires live shared state between users:

- A vibe post from one user needs to appear on every other user's map immediately
- Wait time reports need to update pins in real time without anyone refreshing
- "Still accurate" confirmations need to be atomic — no double-confirming
- User presence (online/offline) needs to propagate instantly

SpacetimeDB makes all of this trivial. There is no separate backend server. No WebSocket boilerplate. No polling. Every reducer call is a transaction that commits atomically and pushes diffs to all subscribed clients automatically. What would normally require a custom Node server + PostgreSQL + Socket.io is replaced by a single TypeScript module.

---

## Features

**Live map**
- Real-time venue pins across NYC, colored by current activity level
- Four heat states: Packed 🔥 / Filling / Chill / Dead 💤 — set by community reports
- Category filters: Food, Drinks, Music, Museums, Parks, Nightlife, Transit, Shopping, Landmarks
- Tourist mode vs. Local mode toggle

**Vibe reports**
- Submit a busyness report for any venue with an optional text note (max 140 chars)
- Reports appear on the map instantly for all connected users
- "Still accurate" confirmations — tap to confirm a report is current; idempotent per identity
- Wait time reports — community-sourced minutes, newest replaces older, auto-expires after 60 min

**User system**
- Automatic identity via SpacetimeDB — no login required
- Custom display handles (set once, remembered across sessions)
- Online/offline presence tracked via connect/disconnect lifecycle hooks

**UI**
- Draggable bottom sheet with two snap points — collapse to peek, drag up to expand
- Mobile-first, optimized for iPhone viewport
- Dark glassmorphism design system with CSS custom properties

---

## Data model

All state lives in SpacetimeDB. There is no other database.

### Tables

**`spot`** — Fixed venues seeded on first publish. 25 real locations within ~1 mile of Herald Square.
```
id (u64, PK, autoInc) · name · latitude · longitude · category
```

**`report`** — A busyness report from a user about a spot.
```
id (u64, PK, autoInc) · spotId (indexed) · reporter (identity) · status · note (optional) · createdAt (indexed)
```
Status must be one of: `packed` · `filling` · `chill` · `dead` — validated server-side in the reducer.

**`user`** — One row per identity that has ever connected.
```
identity (PK) · handle · online (bool)
```

**`confirmation`** — "Still accurate" confirmations. One per identity per report — idempotent.
```
id (u64, PK, autoInc) · reportId (indexed) · confirmer (identity) · createdAt
```

**`wait_time`** — Current wait time for a spot. One row per spot; newest replaces older.
```
spotId (PK, one per spot) · minutes · reporter (identity) · createdAt
```

### Reducers

| Reducer | What it does |
|---|---|
| `submitReport` | Validates status, checks spot exists, inserts a report |
| `setHandle` | Sets the caller's display name (trimmed, max 24 chars) |
| `confirmReport` | Idempotent confirmation — no-ops if already confirmed by this identity |
| `reportWait` | Upserts wait time for a spot — updates if row exists, inserts if not |

### Lifecycle hooks

| Hook | What it does |
|---|---|
| `init` | Seeds 25 NYC venues on first publish |
| `onConnect` | Creates user row or flips existing user online |
| `onDisconnect` | Flips user offline |

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend + database | SpacetimeDB (TypeScript module) |
| Frontend | React + TypeScript |
| Styling | Tailwind CSS + CSS custom properties |
| Map | react-leaflet |
| Deployment | Vercel |

---

## Project structure

```
nyc-pulse/
├── spacetimedb/
│   └── src/
│       └── index.ts          # All tables, reducers, and seed data
├── src/
│   ├── components/
│   │   ├── BottomSheet.tsx   # Draggable two-snap-point sheet
│   │   └── ...               # Map, pins, report panel, etc.
│   ├── module_bindings/      # Auto-generated from spacetimedb module
│   └── lib/                  # Utilities and helpers
├── index.html
├── package.json
└── vite.config.ts
```

---

## Running locally

### Prerequisites
- Node.js 18+
- SpacetimeDB CLI — [install here](https://spacetimedb.com/install)

### Setup

```bash
# Clone the repo
git clone https://github.com/AnnieShann/nyc-pulse.git
cd nyc-pulse

# Install dependencies
npm install

# Start SpacetimeDB locally and publish the module
cd spacetimedb
spacetime start
spacetime publish nyc-pulse

# Generate TypeScript bindings
spacetime generate --lang typescript --out-dir ../src/module_bindings

# Start the frontend
cd ..
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Environment variables

Create a `.env.local` file:
```
VITE_SPACETIMEDB_HOST=localhost:3000
VITE_SPACETIMEDB_DB_NAME=nyc-pulse
```

---

## Seed data

On first publish, the `init` lifecycle hook seeds 25 real NYC venues within ~1 mile of Herald Square, including Times Square, Bryant Park, Madison Square Garden, Chelsea Market, The High Line, Union Square, Grand Central Terminal, and Koreatown. No manual seeding step needed.

---

## Team

Built at the SpacetimeDB Launchpad Hackathon during NYC Tech Week, June 2026.

| Name | Role |
|---|---|
| Masha Zaitsev | Design + Frontend |
| Shubham Kumar | SpacetimeDB backend |
| Annie Shan | Frontend integration |
| Daniel Henk, Masha Zaitsev | AI + data |

---

## How SpacetimeDB is used

SpacetimeDB is not an add-on — it **is** the backend. Every interaction in the app flows through a reducer:

- User opens app → `onConnect` fires, user row created or updated
- User submits a vibe → `submitReport` validates and commits atomically
- Another user's map → receives the new report via subscription push, no refresh needed
- User taps "Still accurate" → `confirmReport` checks for duplicates and inserts idempotently
- User reports a wait → `reportWait` upserts so there's always exactly one current wait per venue

The frontend subscribes to all five tables on connect. SpacetimeDB handles diffing and pushing — the React components just read from the live table cache via the generated hooks.
