// Curated details for our fixed NYC spots (no API key needed). For LIVE Google
// data (ratings, hours, Google's photos) swap this for a Places API call.
export type PlaceInfo = {
  blurb?: string;
  website?: string;
  price?: string; // e.g. "$20–80"
  tags?: string[]; // amenities-style chips
};

// Keyed by spot name (must match the seeded names in spacetimedb/src/index.ts).
export const PLACE_INFO: Record<string, PlaceInfo> = {
  "Macy's Herald Square": {
    blurb: 'Flagship department store — 11 floors of everything, since 1902.',
    website: 'https://www.macys.com/stores/ny/new-york/herald-square_2.html',
    price: '$$',
    tags: ['Shopping', 'Landmark', 'Restrooms'],
  },
  'Empire State Building': {
    blurb: 'Art-deco icon with 86th & 102nd floor observation decks.',
    website: 'https://www.esbnyc.com',
    price: '$$$',
    tags: ['Observation deck', 'Landmark', 'Tickets'],
  },
  'Koreatown (32nd St)': {
    blurb: 'Neon "K-Town" — Korean BBQ, karaoke and 24-hour eats.',
    price: '$$',
    tags: ['Korean', 'Late night', 'Karaoke'],
  },
  'Madison Square Garden': {
    blurb: 'The Garden — Knicks, Rangers and arena shows above Penn.',
    website: 'https://www.msg.com',
    price: '$$$',
    tags: ['Arena', 'Events', 'Sports'],
  },
  'Penn Station': {
    blurb: 'Busiest transit hub in the hemisphere — LIRR, NJ Transit, Amtrak.',
    website: 'https://www.amtrak.com/stations/nyp',
    tags: ['Transit', 'Trains', 'Restrooms'],
  },
  'Bryant Park': {
    blurb: 'Midtown lawn behind the library — seasonal market & ice rink.',
    website: 'https://bryantpark.org',
    tags: ['Park', 'Free Wi-Fi', 'Seasonal'],
  },
  'NY Public Library': {
    blurb: 'The Stephen A. Schwarzman Building and its Rose Reading Room.',
    website: 'https://www.nypl.org/locations/schwarzman',
    tags: ['Library', 'Landmark', 'Free'],
  },
  'Times Square': {
    blurb: 'The Crossroads of the World — billboards, theaters, crowds.',
    website: 'https://www.timessquarenyc.org',
    tags: ['Landmark', 'Theater', 'Open 24h'],
  },
  'Madison Square Park': {
    blurb: 'Leafy Flatiron square and the original Shake Shack.',
    website: 'https://madisonsquarepark.org',
    tags: ['Park', 'Dog run', 'Art'],
  },
  'Eataly NYC Flatiron': {
    blurb: 'Sprawling Italian market, counters and rooftop beer garden.',
    website: 'https://www.eataly.com/us_en/stores/nyc-flatiron',
    price: '$$',
    tags: ['Italian', 'Market', 'Rooftop'],
  },
  'Flatiron Building': {
    blurb: '1902 Beaux-Arts wedge where Broadway meets Fifth.',
    price: '$',
    tags: ['Landmark', 'Photo spot'],
  },
  'Shake Shack (Madison Sq)': {
    blurb: 'The original Shake Shack kiosk in Madison Square Park.',
    website: 'https://www.shakeshack.com',
    price: '$$',
    tags: ['Burgers', 'Outdoor seating'],
  },
  'The Morgan Library': {
    blurb: "J.P. Morgan's library turned museum of manuscripts & art.",
    website: 'https://www.themorgan.org',
    price: '$$',
    tags: ['Museum', 'Café'],
  },
  'Greeley Square': {
    blurb: 'Pocket park across from Herald Square with café tables.',
    tags: ['Park', 'Seating'],
  },
  'Manhattan Mall': {
    blurb: 'Vertical mall at 33rd & 6th above the subway.',
    price: '$$',
    tags: ['Shopping', 'Food court'],
  },
  'The Pennsy Food Hall': {
    blurb: 'Upscale food hall atop Penn Station.',
    price: '$$',
    tags: ['Food hall', 'Takeout'],
  },
  'Ace Hotel Lobby': {
    blurb: 'Buzzy lobby-as-living-room with coffee and cocktails.',
    website: 'https://acehotel.com/new-york',
    price: '$$$',
    tags: ['Cocktails', 'Coffee', 'Wi-Fi'],
  },
  'Grand Central Terminal': {
    blurb: 'Beaux-Arts rail cathedral with the celestial ceiling.',
    website: 'https://www.grandcentralterminal.com',
    tags: ['Transit', 'Landmark', 'Dining'],
  },
  'Rockefeller Center': {
    blurb: 'Plaza, Top of the Rock, and the seasonal skating rink.',
    website: 'https://www.rockefellercenter.com',
    price: '$$$',
    tags: ['Landmark', 'Observation', 'Shops'],
  },
  'St. Patrick’s Cathedral': {
    blurb: 'Neo-Gothic Catholic cathedral on Fifth Avenue.',
    website: 'https://saintpatrickscathedral.org',
    tags: ['Landmark', 'Free', 'Historic'],
  },
  'Union Square': {
    blurb: 'Greenmarket, statues and the city’s favorite meeting steps.',
    tags: ['Park', 'Greenmarket', 'Transit'],
  },
  'Chelsea Market': {
    blurb: 'Former Nabisco factory turned food hall and shops.',
    website: 'https://www.chelseamarket.com',
    price: '$$',
    tags: ['Food hall', 'Shopping'],
  },
  'Hudson Yards (Vessel)': {
    blurb: 'Shops, restaurants and the honeycomb Vessel sculpture.',
    website: 'https://www.hudsonyardsnewyork.com',
    price: '$$$',
    tags: ['Shopping', 'Landmark', 'Dining'],
  },
  'The High Line (W 14th)': {
    blurb: 'Elevated rail-to-park promenade over the West Side.',
    website: 'https://www.thehighline.org',
    tags: ['Park', 'Free', 'Walk'],
  },
  'Korilla / K-Town BBQ Row': {
    blurb: 'Korean BBQ and quick Korean eats along 32nd Street.',
    price: '$$',
    tags: ['Korean', 'BBQ'],
  },
};

export function placeInfoFor(name: string): PlaceInfo {
  return PLACE_INFO[name] ?? {};
}

// Google Maps deep links (no API key required).
export function mapsSearchUrl(name: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ', New York, NY')}`;
}
export function mapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
