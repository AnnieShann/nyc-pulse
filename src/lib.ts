// Shared constants + pure helpers for NYC Pulse.
import type { Timestamp } from 'spacetimedb';
import type { Report, Spot, User } from './module_bindings/types';

// The status set must match the server module's STATUSES (kept in sync by hand —
// the server intentionally doesn't export it; see spacetimedb/src/index.ts).
export type Status = 'packed' | 'filling' | 'chill' | 'dead';
export const STATUSES: Status[] = ['packed', 'filling', 'chill', 'dead'];

// Pin / badge colors. packed=red, filling=amber, chill=green per the spec.
// `dead` (reported empty) gets its own muted slate so it's distinct from
// NO_DATA (a spot with no recent report at all), which is grey.
export const STATUS_META: Record<Status, { label: string; color: string; blurb: string }> = {
  packed: { label: 'Packed', color: '#e53935', blurb: 'Rammed — wall to wall' },
  filling: { label: 'Filling', color: '#fb8c00', blurb: 'Getting busy' },
  chill: { label: 'Chill', color: '#43a047', blurb: 'Comfortable' },
  dead: { label: 'Dead', color: '#5c6bc0', blurb: 'Empty / quiet' },
};
export const NO_DATA_COLOR = '#9e9e9e';

// A spot's pin reflects its most recent report only if that report is fresh.
// Older than this (or no report at all) => grey "no data".
export const STALE_MS = 60 * 60 * 1000; // 60 minutes
// "Hot now" counts reports from the last 30 minutes.
export const HOT_WINDOW_MS = 30 * 60 * 1000;

// SpacetimeDB Timestamp -> epoch milliseconds (number).
export function tsToMs(ts: Timestamp): number {
  return Number(ts.microsSinceUnixEpoch / 1000n);
}

// Compact relative-time label, e.g. "just now", "3m", "2h", "1d".
export function formatAge(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// The latest report per spotId (by createdAt), as a Map keyed by spot id.
export function latestReportBySpot(reports: readonly Report[]): Map<bigint, Report> {
  const out = new Map<bigint, Report>();
  for (const r of reports) {
    const cur = out.get(r.spotId);
    if (!cur || tsToMs(r.createdAt) > tsToMs(cur.createdAt)) out.set(r.spotId, r);
  }
  return out;
}

// The fill color for a spot's pin given its latest report and the current time.
export function colorForSpot(latest: Report | undefined, now: number): string {
  if (!latest) return NO_DATA_COLOR;
  if (now - tsToMs(latest.createdAt) > STALE_MS) return NO_DATA_COLOR;
  return STATUS_META[(latest.status as Status)]?.color ?? NO_DATA_COLOR;
}

// "Hot now": spots ranked by number of reports within the last 30 minutes.
export function hotSpots(
  reports: readonly Report[],
  spotsById: Map<bigint, Spot>,
  now: number
): Array<{ spot: Spot; count: number; latest: Report }> {
  const counts = new Map<bigint, { count: number; latest: Report }>();
  for (const r of reports) {
    if (now - tsToMs(r.createdAt) > HOT_WINDOW_MS) continue;
    const e = counts.get(r.spotId);
    if (!e) {
      counts.set(r.spotId, { count: 1, latest: r });
    } else {
      e.count += 1;
      if (tsToMs(r.createdAt) > tsToMs(e.latest.createdAt)) e.latest = r;
    }
  }
  const rows: Array<{ spot: Spot; count: number; latest: Report }> = [];
  for (const [spotId, e] of counts) {
    const spot = spotsById.get(spotId);
    if (spot) rows.push({ spot, count: e.count, latest: e.latest });
  }
  rows.sort((a, b) => b.count - a.count || tsToMs(b.latest.createdAt) - tsToMs(a.latest.createdAt));
  return rows;
}

// Map an identity (hex) to a display handle, falling back to a short hex.
export function handleFor(users: readonly User[]): (idHex: string) => string {
  const byHex = new Map<string, string>();
  for (const u of users) byHex.set(u.identity.toHexString(), u.handle);
  return (idHex: string) => byHex.get(idHex) ?? `anon-${idHex.slice(0, 4)}`;
}
