// config.js — the one place for every number, recipe and colour in Sizzle & Serve.
// A small restaurant kitchen, top-down: grab, chop, grill, assemble, serve before
// the customer's patience runs out. Nothing here is copied from another game.
export const VIEW_W = 1280;
export const VIEW_H = 720;

export const SHIFT_SECONDS = 180;
export const RUSH_AT = 30; // seconds left when the dinner rush starts

export const CHEF_SPEED = 285;
export const CHEF_RADIUS = 22;
export const INTERACT_RANGE = 86;

export const CHOP_SECONDS = 1.4;
export const GRILL_SECONDS = 5.0;
export const GRILL_BURN_AFTER = 11.0;
export const STOVE_SECONDS = 6.0;

// Every ingredient the kitchen stocks. kind groups what a station can do with it.
export const INGREDIENTS = {
  bun:     { name: 'Bun',     key: '1', colour: '#e8b96a', dark: '#b97f2e' },
  patty:   { name: 'Patty',   key: '2', colour: '#8a5a3b', dark: '#5d3a24' },
  lettuce: { name: 'Lettuce', key: '3', colour: '#7dc24a', dark: '#4c8a26' },
  tomato:  { name: 'Tomato',  key: '4', colour: '#e5484d', dark: '#a92c30' },
  cheese:  { name: 'Cheese',  key: '5', colour: '#ffc93c', dark: '#d99a00' },
  pot:     { name: 'Soup Pot', key: '6', colour: '#9aa5b1', dark: '#5d6b7a' },
};

// A dish is a set of finished items. chop/cooked transform a raw item into its
// finished form; soup is a dish on its own (pot cooked on the stove).
export const TRANSFORMS = {
  lettuce: { station: 'board', result: 'lettuceChopped', label: 'Chopped Lettuce' },
  tomato:  { station: 'board', result: 'tomatoChopped',  label: 'Chopped Tomato' },
  patty:   { station: 'grill', result: 'pattyCooked',     label: 'Grilled Patty' },
  pot:     { station: 'stove', result: 'soup',            label: 'Tomato Soup' },
};

export const FINISHED_NAMES = {
  bun: 'Bun', pattyCooked: 'Grilled Patty', lettuceChopped: 'Chopped Lettuce',
  tomatoChopped: 'Chopped Tomato', cheese: 'Cheese', soup: 'Tomato Soup',
};

// Recipes: the dishes customers order. Each lists the finished items a plate needs.
export const RECIPES = [
  {
    id: 'burger', name: 'Sunny Burger', price: 14,
    needs: ['bun', 'pattyCooked', 'lettuceChopped'],
    blurb: 'bun + grilled patty + chopped lettuce',
  },
  {
    id: 'salad', name: 'Garden Salad', price: 12,
    needs: ['lettuceChopped', 'tomatoChopped', 'cheese'],
    blurb: 'chopped lettuce + chopped tomato + cheese',
  },
  {
    id: 'melt', name: 'Melty Melt', price: 13,
    needs: ['bun', 'cheese', 'pattyCooked'],
    blurb: 'bun + cheese + grilled patty',
  },
  {
    id: 'soup', name: 'Tomato Soup', price: 11,
    needs: ['soup'],
    blurb: 'one pot, simmered on the stove',
  },
];

export const PALETTE = {
  floor: '#c98f5f', floorDark: '#bd8252', floorLine: '#a96f42',
  wall: '#7a4a2b', wallTop: '#8d5a35',
  counter: '#e9e2d0', counterEdge: '#b8ab8a',
  board: '#f4ead2', grill: '#3a3f47', stove: '#4a4f58',
  window: '#2f6f5e', fridge: '#dfe8ee', crate: '#a9713f',
  island: '#e9e2d0', ink: '#2b2118', paper: '#fff8e7',
  gold: '#ffc93c', red: '#e5484d', green: '#4c9a3f',
};

export function orderPatience(elapsedShift) {
  // Patience shrinks as the shift wears on: 62s early, down to 36s in the rush.
  const t = Math.min(1, elapsedShift / SHIFT_SECONDS);
  return Math.round(62 - 26 * t);
}

export function spawnInterval(elapsedShift, rush) {
  if (rush) return 9;
  const t = Math.min(1, elapsedShift / SHIFT_SECONDS);
  return 15 - 5 * t;
}
