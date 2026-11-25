// stations.js — the kitchen itself: where every counter stands, what it does,
// and the cooking slots that tick while the chef runs elsewhere.
// A station is a rect the chef cannot walk through plus an anchor point to stand at.
export const STATIONS = [
  { id: 'fridge',  name: 'Fridge',   x: 36,  y: 168, w: 150, h: 96,  anchor: { x: 111, y: 300 }, hint: '1 bun · 2 patty · 5 cheese · 6 pot' },
  { id: 'produce', name: 'Produce',  x: 206, y: 168, w: 210, h: 96,  anchor: { x: 311, y: 300 }, hint: '3 lettuce · 4 tomato' },
  { id: 'board',   name: 'Chopping Board', x: 36, y: 470, w: 190, h: 96, anchor: { x: 131, y: 450 }, hint: 'hold E to chop' },
  { id: 'grill',   name: 'Grill',    x: 908, y: 168, w: 170, h: 96,  anchor: { x: 993, y: 300 }, hint: 'E: place / take patty' },
  { id: 'stove',   name: 'Stove',    x: 1098, y: 168, w: 146, h: 96, anchor: { x: 1171, y: 300 }, hint: 'E: place pot / take soup' },
  { id: 'island',  name: 'Assembly Counter', x: 470, y: 400, w: 340, h: 110, anchor: { x: 640, y: 372 }, hint: 'E: add to plate · pick up plate' },
  { id: 'window',  name: 'Serving Window', x: 908, y: 470, w: 336, h: 96, anchor: { x: 1076, y: 450 }, hint: 'E: serve the dish' },
  { id: 'bin',     name: 'Bin',      x: 36,  y: 620, w: 110, h: 64,  anchor: { x: 91,  y: 600 }, hint: 'E: throw away' },
];

export function stationById(id) {
  return STATIONS.find((s) => s.id === id);
}

// Cooking slots: the grill holds two patties, the stove one pot. Each slot ticks
// on its own, so the chef can start a patty, chop lettuce, and come back for it.
export function createKitchenState() {
  return {
    grill: [
      { item: null, progress: 0, done: false, burnt: false, announced: false },
      { item: null, progress: 0, done: false, burnt: false, announced: false },
    ],
    stove: [
      { item: null, progress: 0, done: false, burnt: false, announced: false },
    ],
    plate: [],          // finished items stacked on the assembly counter
    chopProgress: 0,   // 0..1 while the chef holds E at the board
    chopItem: null,    // the raw item currently being chopped
  };
}

// The nearest station whose anchor the chef can reach, or null.
export function nearestStation(chefX, chefY, range) {
  let best = null, bestD = Infinity;
  for (const s of STATIONS) {
    const d = Math.hypot(chefX - s.anchor.x, chefY - s.anchor.y);
    if (d < bestD) { bestD = d; best = s; }
  }
  return bestD <= range ? best : null;
}
