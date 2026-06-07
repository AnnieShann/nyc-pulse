import type { VercelRequest, VercelResponse } from '@vercel/node';

// Free OpenRouter model — its id ends in ":free". Swap this to the exact id you want.
const MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

const SYSTEM =
  "Convert the user's freeform request for places into structured filters. " +
  'Return ONLY JSON, no prose: ' +
  "{ categories: string[], maxPrice: 1-4|null, busyness: 'any'|'chill'|'lively'|'packed'|null, " +
  'maxDistanceMeters: number|null, keywords: string[] }.';

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

// This function's ONLY job is intent parsing — it never invents places.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ filters: EMPTY, source: 'fallback', error: 'method not allowed' });
    return;
  }

  const key = process.env.OPENROUTER_API_KEY;
  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body;
  const query = String(body?.query ?? '').slice(0, 500).trim();

  // No key or empty query → let the client fall back to busyness + distance ranking.
  if (!key || !query) {
    res.status(200).json({ filters: EMPTY, source: 'fallback' });
    return;
  }

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
        max_tokens: 200,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: query },
        ],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (!r.ok) {
      res.status(200).json({ filters: EMPTY, source: 'fallback', error: `openrouter ${r.status}` });
      return;
    }
    const data = await r.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    const filters = parseFilters(content) ?? EMPTY;
    res.status(200).json({ filters, source: 'llm' });
  } catch (e) {
    // Slow / rate-limited / down → always return something usable.
    res.status(200).json({ filters: EMPTY, source: 'fallback', error: String(e) });
  }
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

// Defensive parse — strip code fences, grab the first {...}, validate fields.
function parseFilters(text: string): Filters | null {
  try {
    let t = text.trim();
    t = t.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start < 0 || end < 0 || end < start) return null;
    const o = JSON.parse(t.slice(start, end + 1));
    const busyness = ['any', 'chill', 'lively', 'packed'].includes(o?.busyness) ? o.busyness : null;
    return {
      categories: Array.isArray(o?.categories) ? o.categories.map(String).slice(0, 8) : [],
      maxPrice: typeof o?.maxPrice === 'number' ? Math.max(1, Math.min(4, o.maxPrice)) : null,
      busyness,
      maxDistanceMeters:
        typeof o?.maxDistanceMeters === 'number' && o.maxDistanceMeters > 0 ? o.maxDistanceMeters : null,
      keywords: Array.isArray(o?.keywords) ? o.keywords.map(String).slice(0, 8) : [],
    };
  } catch {
    return null;
  }
}
