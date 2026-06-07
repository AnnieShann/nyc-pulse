// Shared constants + pure helpers for NYC Pulse.
// Colors/glows/tints match the NYC Pulse design system exactly.
import type { Timestamp } from 'spacetimedb';
import chroma from 'chroma-js';
import type { Confirmation, Photo, Report, Spot, User, WaitTime } from './module_bindings/types';

export type Status = 'packed' | 'filling' | 'chill' | 'dead';
export const STATUSES: Status[] = ['packed', 'filling', 'chill', 'dead'];

// Exact status colors + subtle glows + tints (must match the live app).
export const STATUS_META: Record<
  Status,
  { label: string; color: string; rgb: [number, number, number]; glow: string; tint: string; blurb: string }
> = {
  packed: {
    label: 'Packed',
    color: '#ff4d4f',
    rgb: [255, 77, 79],
    glow: '0 0 15px rgba(255,77,79,0.40)',
    tint: 'rgba(255,77,79,0.14)',
    blurb: 'slammed',
  },
  filling: {
    label: 'Filling',
    color: '#ffa52c',
    rgb: [255, 165, 44],
    glow: '0 0 15px rgba(255,165,44,0.36)',
    tint: 'rgba(255,165,44,0.14)',
    blurb: 'picking up',
  },
  chill: {
    label: 'Chill',
    color: '#27e08a',
    rgb: [39, 224, 138],
    glow: '0 0 15px rgba(39,224,138,0.36)',
    tint: 'rgba(39,224,138,0.14)',
    blurb: 'room to breathe',
  },
  dead: {
    label: 'Dead',
    color: '#6c7bff',
    rgb: [108, 123, 255],
    glow: '0 0 15px rgba(108,123,255,0.36)',
    tint: 'rgba(108,123,255,0.14)',
    blurb: 'ghost town',
  },
};

// No data / report aged out — soft blue-gray (reads cleanly on the colorful map).
export const NO_DATA_COLOR = '#8c9cad';
export const NO_DATA_RGB: [number, number, number] = [140, 156, 173];
export const NO_DATA_TINT = 'rgba(140,156,173,0.16)';

// A spot's pin reflects its most recent report only if fresh; else "No data".
export const STALE_MS = 60 * 60 * 1000; // 60 min
export const HOT_WINDOW_MS = 30 * 60 * 1000; // "last 30 min"
export const BURST_MS = 12 * 1000; // pin "land" burst window
export const HOT_RING_MIN = 2; // reports in window for a pin to emit the hot ring

export function tsToMs(ts: Timestamp): number {
  return Number(ts.microsSinceUnixEpoch / 1000n);
}

// Relative time: "now", "40s", "4m", "2h", "1d". Monospace in the UI.
export function formatAge(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  if (s < 10) return 'now';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// Counts get thousands separators ("1,284").
export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

// Handles render lowercase with a leading @.
export function atHandle(handle: string): string {
  return '@' + handle.replace(/^@/, '').toLowerCase();
}

export function latestReportBySpot(reports: readonly Report[]): Map<bigint, Report> {
  const out = new Map<bigint, Report>();
  for (const r of reports) {
    const cur = out.get(r.spotId);
    if (!cur || tsToMs(r.createdAt) > tsToMs(cur.createdAt)) out.set(r.spotId, r);
  }
  return out;
}

// "Hot Now": spots ranked by report count within the last 30 minutes.
export function hotSpots(
  reports: readonly Report[],
  spotsById: Map<bigint, Spot>,
  now: number
): Array<{ spot: Spot; count: number; latest: Report }> {
  const counts = new Map<bigint, { count: number; latest: Report }>();
  for (const r of reports) {
    if (now - tsToMs(r.createdAt) > HOT_WINDOW_MS) continue;
    const e = counts.get(r.spotId);
    if (!e) counts.set(r.spotId, { count: 1, latest: r });
    else {
      e.count += 1;
      if (tsToMs(r.createdAt) > tsToMs(e.latest.createdAt)) e.latest = r;
    }
  }
  const rows: Array<{ spot: Spot; count: number; latest: Report }> = [];
  for (const [spotId, e] of counts) {
    const spot = spotsById.get(spotId);
    if (spot) rows.push({ spot, count: e.count, latest: e.latest });
  }
  rows.sort(
    (a, b) => b.count - a.count || tsToMs(b.latest.createdAt) - tsToMs(a.latest.createdAt)
  );
  return rows;
}

// Photos grouped by spot, newest first.
export function photosBySpot(photos: readonly Photo[]): Map<bigint, Photo[]> {
  const m = new Map<bigint, Photo[]>();
  for (const p of photos) {
    const arr = m.get(p.spotId);
    if (arr) arr.push(p);
    else m.set(p.spotId, [p]);
  }
  for (const arr of m.values()) arr.sort((a, b) => tsToMs(b.createdAt) - tsToMs(a.createdAt));
  return m;
}

export function handleFor(users: readonly User[]): (idHex: string) => string {
  const byHex = new Map<string, string>();
  for (const u of users) byHex.set(u.identity.toHexString(), u.handle);
  return (idHex: string) => byHex.get(idHex) ?? `anon-${idHex.slice(0, 4)}`;
}

export const WAIT_EXPIRE_MS = 60 * 60 * 1000; // wait times auto-expire after 60 min
export const CONFIRM_FEED_BONUS_MS = 3 * 60 * 1000; // each confirm floats a report ~3 min up

// ---------------------------------------------------------------------------
// Composite busyness (single source of truth). A spot's displayed status is the
// recency-weighted average of its reports' ordinal values over the last 2 hours
// (30-minute half-life). Replaces the old "latest report wins" derivation.
// ---------------------------------------------------------------------------
export const COMPOSITE_WINDOW_MS = 2 * 60 * 60 * 1000; // hard 2h cutoff
const HALF_LIFE_MIN = 30;
export const STATUS_VALUE: Record<Status, number> = {
  dead: 0,
  chill: 33,
  filling: 66,
  packed: 100,
};

// F8: confirmations per report id.
export function confirmCountsByReport(confirmations: readonly Confirmation[]): Map<bigint, number> {
  const m = new Map<bigint, number>();
  for (const c of confirmations) m.set(c.reportId, (m.get(c.reportId) ?? 0) + 1);
  return m;
}

// F9: the current (non-expired) wait per spot.
export function freshWaitBySpot(
  waits: readonly WaitTime[],
  now: number
): Map<bigint, { minutes: number; ageMs: number }> {
  const m = new Map<bigint, { minutes: number; ageMs: number }>();
  for (const w of waits) {
    const age = now - tsToMs(w.createdAt);
    if (age >= 0 && age <= WAIT_EXPIRE_MS) m.set(w.spotId, { minutes: w.minutes, ageMs: age });
  }
  return m;
}

export type Composite = { score: number; weight: number; count: number };

// exponential time-decay: 0.5 ** (ageMinutes / 30)
function decayWeight(ageMs: number): number {
  return Math.pow(0.5, ageMs / 60000 / HALF_LIFE_MIN);
}

// Composite for a single spot's reports (the canonical formula).
export function computeComposite(reports: readonly Report[], now: number): Composite {
  let sumW = 0;
  let sumWV = 0;
  let count = 0;
  for (const r of reports) {
    const ageMs = now - tsToMs(r.createdAt);
    if (ageMs < 0 || ageMs > COMPOSITE_WINDOW_MS) continue;
    const v = STATUS_VALUE[r.status as Status];
    if (v === undefined) continue;
    const w = decayWeight(ageMs);
    sumW += w;
    sumWV += v * w;
    count += 1;
  }
  return { score: count ? sumWV / sumW : 0, weight: sumW, count };
}

// Composite for every spot, single pass over all reports.
export function compositeBySpot(reports: readonly Report[], now: number): Map<bigint, Composite> {
  const acc = new Map<bigint, { sumW: number; sumWV: number; count: number }>();
  for (const r of reports) {
    const ageMs = now - tsToMs(r.createdAt);
    if (ageMs < 0 || ageMs > COMPOSITE_WINDOW_MS) continue;
    const v = STATUS_VALUE[r.status as Status];
    if (v === undefined) continue;
    const w = decayWeight(ageMs);
    const e = acc.get(r.spotId) ?? { sumW: 0, sumWV: 0, count: 0 };
    e.sumW += w;
    e.sumWV += v * w;
    e.count += 1;
    acc.set(r.spotId, e);
  }
  const out = new Map<bigint, Composite>();
  for (const [id, e] of acc) out.set(id, { score: e.sumWV / e.sumW, weight: e.sumW, count: e.count });
  return out;
}

// Nearest discrete tag for a 0–100 score (midpoints of 0/33/66/100).
export function scoreToLabel(score: number): Status {
  if (score < 16.5) return 'dead';
  if (score < 49.5) return 'chill';
  if (score < 83) return 'filling';
  return 'packed';
}

// Continuous cool→hot ramp, interpolated in LCH (not raw RGB).
const COLOR_RAMP = chroma.scale(['#2B6CB0', '#27E08A', '#FFA52C', '#FF4D4F']).mode('lch');
export function scoreToColor(score: number): string {
  return COLOR_RAMP(Math.max(0, Math.min(1, score / 100))).hex();
}
export function scoreToRgb(score: number): [number, number, number] {
  const [r, g, b] = chroma(scoreToColor(score)).rgb();
  return [Math.round(r), Math.round(g), Math.round(b)];
}

// 0..1 confidence from total decay-weight (how fresh/dense the data is).
export function confidence(weight: number): number {
  return Math.max(0, Math.min(1, weight / 2.5));
}

// Per-pin visuals. Dot + halo are a CONSTANT size for every pin — only the color
// (and a faint glow) varies. (Busyness shows via color, not size.)
const PIN_CORE = 30; // px — same for all dots
const PIN_AURA = 64; // px — same soft bloom for all
export function pinVisual(
  rgb: [number, number, number],
  _heat: number,
  hasData: boolean
): { core: number; aura: number; auraOpacity: number; glow: string } {
  const [r, g, b] = rgb;
  if (!hasData) {
    return {
      core: PIN_CORE,
      aura: PIN_AURA,
      auraOpacity: 0.14,
      glow: `0 0 10px 1px rgba(${r},${g},${b},0.32)`,
    };
  }
  return {
    core: PIN_CORE,
    aura: PIN_AURA,
    auraOpacity: 0.26,
    glow: `0 0 18px 4px rgba(${r},${g},${b},0.5)`,
  };
}
