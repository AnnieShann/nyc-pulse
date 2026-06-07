// Reliable, category-appropriate stock thumbnails for venues that have no live
// user photo. Photos are deterministic per name (same venue → same image) and
// chosen from a category pool. All Unsplash IDs below are verified to resolve.
// Unsplash hotlinking is permitted by their license.

const BASE = 'https://images.unsplash.com/';
const PARAMS = '?w=400&h=300&fit=crop&q=60';

const POOLS: Record<string, string[]> = {
  food: [
    'photo-1517248135467-4c7edcad34c4',
    'photo-1414235077428-338989a2e8c0',
    'photo-1555396273-367ea4eb4db5',
    'photo-1552566626-52f8b828add9',
    'photo-1466978913421-dad2ebd01d17',
    'photo-1559339352-11d035aa65de',
    'photo-1424847651672-bf20a4b0982b',
  ],
  nightlife: [
    'photo-1514933651103-005eec06c04b',
    'photo-1470337458703-46ad1756a187',
    'photo-1543007630-9710e4a00a20',
    'photo-1566417713940-fe7c737a9ef2',
    'photo-1572116469696-31de0f17cc34',
  ],
  museum: [
    'photo-1518998053901-5348d3961a04',
    'photo-1554907984-15263bfd63bd',
    'photo-1580537659466-0a9bfa916a54',
    'photo-1574182245530-967d9b3831af',
    'photo-1513364776144-60967b0f800f',
    'photo-1605429523419-d828acb941d9',
  ],
  park: [
    'photo-1534251369789-5067c8b8602a',
    'photo-1496905583330-eb54c7e5915a',
    'photo-1505765050516-f72dcac9c60e',
    'photo-1519331379826-f10be5486c6f',
  ],
  landmark: [
    'photo-1496442226666-8d4d0e62e6e9',
    'photo-1485871981521-5b1fd3805eee',
    'photo-1522083165195-3424ed129620',
  ],
  shopping: [
    'photo-1441986300917-64674bd600d8',
    'photo-1567401893414-76b7b1e5a7a5',
    'photo-1483985988355-763728e1935b',
  ],
  transit: [
    'photo-1556122071-e404eaedb77f',
    'photo-1474487548417-781cb71495f3',
    'photo-1517090504586-fde19ea6066f',
    'photo-1581262177000-8139a463e531',
  ],
  venue: [
    'photo-1540039155733-5bb30b53aa14',
    'photo-1493676304819-0d7a8d026dcf',
    'photo-1429962714451-bb934ecdc4ec',
  ],
  default: [
    'photo-1502602898657-3e91760cbb34',
    'photo-1480714378408-67cf0d13bc1b',
    'photo-1449824913935-59a10b8d2000',
  ],
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Deterministic category-appropriate thumbnail URL for a venue.
export function venuePhotoFor(name: string, category: string): string {
  const pool = POOLS[category.toLowerCase()] ?? POOLS.default;
  return BASE + pool[hash(name) % pool.length] + PARAMS;
}
