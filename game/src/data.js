// data.js — the pantry, the stations and the recipe book of The Golden Ladle.
// Every ingredient names the one station that prepares it; every recipe is a
// set of prepared ingredients. Nothing here is copied from any other game.

export const STATIONS = {
  chop: { id: 'chop', name: 'Chopping Board', verb: 'Chop', gerund: 'Chopping', key: 'C', seconds: 2.0, color: '#b07a45', accent: '#8a5a2b' },
  grill: { id: 'grill', name: 'Grill', verb: 'Grill', gerund: 'Grilling', key: 'G', seconds: 4.0, color: '#4a4a52', accent: '#e2572b' },
  simmer: { id: 'simmer', name: 'Simmer Pot', verb: 'Simmer', gerund: 'Simmering', key: 'S', seconds: 5.0, color: '#5b7d8a', accent: '#2f5d6e' },
  fry: { id: 'fry', name: 'Fryer', verb: 'Fry', gerund: 'Frying', key: 'F', seconds: 3.0, color: '#c98f2d', accent: '#9a6a14' },
};

export const STATION_ORDER = ['chop', 'grill', 'simmer', 'fry'];

// Ten pantry ingredients. `station` is where the raw item must be prepared;
// `color`/`shape` drive the little canvas food portraits.
export const INGREDIENTS = [
  { id: 'tomato', name: 'Tomato', station: 'chop', color: '#d9392b', dark: '#a11f16', shape: 'round', emoji: '🍅' },
  { id: 'lettuce', name: 'Lettuce', station: 'chop', color: '#7bc043', dark: '#4d8a24', shape: 'leaf', emoji: '🥬' },
  { id: 'onion', name: 'Onion', station: 'chop', color: '#efe3c8', dark: '#c9a86a', shape: 'rings', emoji: '🧅' },
  { id: 'mushroom', name: 'Mushroom', station: 'simmer', color: '#d8c3a5', dark: '#a8875f', shape: 'cap', emoji: '🍄' },
  { id: 'chicken', name: 'Chicken', station: 'grill', color: '#e8b06a', dark: '#b97c33', shape: 'drum', emoji: '🍗' },
  { id: 'beef', name: 'Beef', station: 'grill', color: '#8a3b2e', dark: '#5f241b', shape: 'steak', emoji: '🥩' },
  { id: 'shrimp', name: 'Shrimp', station: 'fry', color: '#f28c6b', dark: '#c85a38', shape: 'curl', emoji: '🍤' },
  { id: 'potato', name: 'Potato', station: 'fry', color: '#f2c14e', dark: '#c08f1f', shape: 'fries', emoji: '🍟' },
  { id: 'bread', name: 'Bread', station: 'grill', color: '#d9a05b', dark: '#a06f2f', shape: 'loaf', emoji: '🍞' },
  { id: 'cheese', name: 'Cheese', station: 'simmer', color: '#ffd23e', dark: '#d9a400', shape: 'wedge', emoji: '🧀' },
];

export const INGREDIENT_BY_ID = Object.fromEntries(INGREDIENTS.map((ing) => [ing.id, ing]));

// Eight recipes. `items` are prepared-ingredient ids; `base` is the coin value
// before the combo multiplier and the patience tip.
export const RECIPES = [
  { id: 'salad', name: 'Garden Salad', items: ['tomato', 'lettuce', 'onion'], base: 120, day: 1, blurb: 'Crisp, fresh, gone in a flash.' },
  { id: 'bruschetta', name: 'Tomato Bruschetta', items: ['bread', 'tomato', 'cheese'], base: 150, day: 1, blurb: 'Toasted bread, bright tomato, melted cheese.' },
  { id: 'soup', name: 'Mushroom Soup', items: ['mushroom', 'tomato', 'cheese'], base: 170, day: 1, blurb: 'Slow-simmered and steaming.' },
  { id: 'chicken-plate', name: 'Grilled Chicken Plate', items: ['chicken', 'potato', 'lettuce'], base: 210, day: 1, blurb: 'The house favourite, char-grilled.' },
  { id: 'beef-skillet', name: 'Beef Skillet', items: ['beef', 'onion', 'mushroom'], base: 230, day: 2, blurb: 'Seared beef over simmered mushrooms.' },
  { id: 'shrimp', name: 'Golden Shrimp', items: ['shrimp', 'potato', 'tomato'], base: 240, day: 2, blurb: 'Crisp shrimp, golden fries.' },
  { id: 'surf-turf', name: 'Surf & Turf', items: ['beef', 'shrimp', 'potato'], base: 280, day: 3, blurb: 'The best of land and sea.' },
  { id: 'feast', name: "Chef's Feast", items: ['chicken', 'mushroom', 'potato', 'lettuce'], base: 320, day: 3, blurb: 'Four stations, one triumphant plate.' },
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

// One shift is 180 seconds; the last 30 are the dinner rush.
export const SHIFT_SECONDS = 180;
export const RUSH_SECONDS = 30;
export const TOTAL_DAYS = 3;

// Day tuning: which recipes are on the menu, how patient the customers are,
// how fast new orders arrive, and how much a lost order stings.
export const DAYS = [
  { day: 1, name: 'Opening Day', patience: 48, spawnEvery: 13, maxOrders: 4, tipRate: 1.0, unlockNote: '4 recipes on the menu' },
  { day: 2, name: 'Regulars Return', patience: 40, spawnEvery: 10, maxOrders: 5, tipRate: 1.2, unlockNote: 'Beef Skillet & Golden Shrimp join the menu' },
  { day: 3, name: 'The Food Critic', patience: 34, spawnEvery: 8, maxOrders: 5, tipRate: 1.5, unlockNote: 'Surf & Turf & the Chef’s Feast join the menu' },
];

export function recipesForDay(day) {
  return RECIPES.filter((r) => r.day <= day);
}

// Combo multiplier: +25% per consecutive clean serve, capped at x3.
export function comboMultiplier(combo) {
  return Math.min(3, 1 + 0.25 * Math.max(0, combo - 1));
}

// A tiny deterministic RNG so the screenshot seeds always deal the same hand.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickFrom(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
