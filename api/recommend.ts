import type { VercelRequest, VercelResponse } from '@vercel/node';

// Paid OpenRouter model (requires account credit). Swap to any id from openrouter.ai/models.
const MODEL = 'anthropic/claude-3.5-haiku';

// Intent-only system prompt (used when the client sends no place list).
const SYSTEM_FILTERS =
  "Convert the user's freeform request for places into structured filters. " +
  'Return ONLY JSON, no prose: ' +
  "{ categories: string[], maxPrice: 1-4|null, busyness: 'any'|'chill'|'lively'|'packed'|null, " +
  'maxDistanceMeters: number|null, keywords: string[] }.';

// Ranking system prompt (used when the client sends the live places from the browser).
const SYSTEM_PICK =
  'You are a local NYC concierge. You are given the live list of places currently in ' +
  "the user's app — each with category, tags, live busyness (0-100, or null if no data) and " +
  'distance in meters. Choose up to 6 that best match the request and order them best-first. ' +
  'Only choose from the given list — never invent places. Consider relevance to the request, ' +
  'proximity, and live busyness. Return ONLY JSON: { "picks": [<i>, ...] } using each place\'s "i".';

type Filters = {
  categories: string[];
  maxPrice: number | null;
  busyness: 'any' | 'chill' | 'lively' | 'packed' | null;
  maxDistanceMeters: number | null;
  keywords: string[];
};

const EMPTY: Filters = {
  categories: [],
  maxPrice: null,
  busyness: null,
  maxDistanceMeters: null,
  keywords: [],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ filters: EMPTY, picks: null, source: 'fallback', error: 'method not allowed' });
    return;
  }

  const key = process.env.OPENROUTER_API_KEY;
  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body;
  const query = String(body?.query ?? '').slice(0, 500).trim();
  const places = Array.isArray(body?.places) ? body.places.slice(0, 60) : [];

  // No key or empty query → client falls back to its own ranking of browser data.
  if (!key || !query) {
    res.status(200).json({ filters: EMPTY, picks: null, source: 'fallback' });
    return;
  }

  const usePicks = places.length > 0;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nyc-pulse-two.vercel.app',
        'X-Title': 'NYC Pulse',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.1,
        max_tokens: 300,
        messages: [
          { role: 'system', content: usePicks ? SYSTEM_PICK : SYSTEM_FILTERS },
          {
            role: 'user',
            content: usePicks
              ? `Request: "${query}"\nPlaces (JSON):\n${JSON.stringify(places)}`
              : query,
          },
        ],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (!r.ok) {
      res.status(200).json({ filters: EMPTY, picks: null, source: 'fallback', error: `openrouter ${r.status}` });
      return;
    }
    const data = await r.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    if (usePicks) {
      const picks = parsePicks(content, places.length);
      // No valid picks → let the client rank the browser data itself.
      res.status(200).json({ picks, source: picks ? 'llm' : 'fallback' });
    } else {
      const filters = parseFilters(content) ?? EMPTY;
      res.status(200).json({ filters, picks: null, source: 'llm' });
    }
  } catch (e) {
    res.status(200).json({ filters: EMPTY, picks: null, source: 'fallback', error: String(e) });
  }
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

function grabJson(text: string): any | null {
  let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start < 0 || end < 0 || end < start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
}

// Parse { picks: [i, ...] } → valid, de-duped indices within range (max 6).
function parsePicks(text: string, n: number): number[] | null {
  const o = grabJson(text);
  if (!o || !Array.isArray(o.picks)) return null;
  const seen = new Set<number>();
  const out: number[] = [];
  for (const v of o.picks) {
    const i = typeof v === 'number' ? v : parseInt(String(v), 10);
    if (Number.isInteger(i) && i >= 0 && i < n && !seen.has(i)) {
      seen.add(i);
      out.push(i);
    }
    if (out.length >= 6) break;
  }
  return out.length ? out : null;
}

function parseFilters(text: string): Filters | null {
  const o = grabJson(text);
  if (!o) return null;
  const busyness = ['any', 'chill', 'lively', 'packed'].includes(o?.busyness) ? o.busyness : null;
  return {
    categories: Array.isArray(o?.categories) ? o.categories.map(String).slice(0, 8) : [],
    maxPrice: typeof o?.maxPrice === 'number' ? Math.max(1, Math.min(4, o.maxPrice)) : null,
    busyness,
    maxDistanceMeters:
      typeof o?.maxDistanceMeters === 'number' && o.maxDistanceMeters > 0 ? o.maxDistanceMeters : null,
    keywords: Array.isArray(o?.keywords) ? o.keywords.map(String).slice(0, 8) : [],
  };
}
