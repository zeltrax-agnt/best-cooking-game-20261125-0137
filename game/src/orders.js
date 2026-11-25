// orders.js — the order board: customers arrive, wait with a draining
// patience meter, and leave happy (served) or angry (walked out).

import { INGREDIENT_BY_ID, RECIPE_BY_ID, pickFrom } from './data.js';
import { availableRecipes, dayConfig, loseOrder } from './state.js';

const CUSTOMERS = [
  'Mara', 'Theo', 'Priya', 'Jonas', 'Aiko', 'Felix', 'Nadia', 'Omar',
  'Lena', 'Ravi', 'Sofia', 'Hugo', 'Ines', 'Marco', 'Yuki', 'Dario',
];

// A customer portrait is just a warm circle, initials and a hat colour —
// original art, drawn fresh every frame, no borrowed faces.
const HAT_COLORS = ['#e2572b', '#2f5d6e', '#7bc043', '#c98f2d', '#8a5a9e', '#d9392b'];

export function spawnOrder(state, forcedRecipeId = null) {
  const cfg = dayConfig(state);
  const recipes = availableRecipes(state);
  if (recipes.length === 0) return null;
  const recipe = forcedRecipeId
    ? RECIPE_BY_ID[forcedRecipeId]
    : pickFrom(state.rng, recipes);
  const patience = cfg.patience * (0.85 + state.rng() * 0.3);
  const order = {
    id: state.nextOrderId++,
    recipe,
    customer: pickFrom(state.rng, CUSTOMERS),
    hat: pickFrom(state.rng, HAT_COLORS),
    patience,
    patienceMax: patience,
    bornAt: state.elapsed,
  };
  state.orders.push(order);
  if (state.selectedOrderId === null) state.selectedOrderId = order.id;
  return order;
}

// One tick of the order board: spawn on schedule, drain patience, drop the
// customers who waited too long. Returns events for sound + message hooks.
export function tickOrders(state, dt) {
  const events = [];
  if (state.phase !== 'playing') return events;
  const cfg = dayConfig(state);
  const rush = state.timeLeft <= 30;
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0 && state.orders.length < cfg.maxOrders) {
    const order = spawnOrder(state);
    if (order) events.push({ type: 'newOrder', order });
    state.spawnTimer = cfg.spawnEvery * (rush ? 0.55 : 1) * (0.8 + state.rng() * 0.4);
  }
  for (const order of [...state.orders]) {
    order.patience -= dt;
    if (order.patience <= 0) {
      state.orders = state.orders.filter((o) => o.id !== order.id);
      if (state.selectedOrderId === order.id) {
        state.selectedOrderId = state.orders[0]?.id ?? null;
      }
      if (state.plate.targetOrderId === order.id) {
        state.plate = { items: [], targetOrderId: null };
      }
      loseOrder(state, order);
      events.push({ type: 'lostOrder', order });
    }
  }
  return events;
}

// The plate's target order: the selected ticket, or the first order whose
// recipe still needs the item being placed.
export function orderForPlate(state) {
  return state.orders.find((o) => o.id === state.selectedOrderId) ?? state.orders[0] ?? null;
}

// Does the plate (plus this one item) still match its target recipe?
export function plateAccepts(state, ingredientId) {
  const order = orderForPlate(state);
  if (!order) return false;
  const wanted = [...order.recipe.items];
  const placed = [...state.plate.items];
  const idx = wanted.indexOf(ingredientId);
  if (idx === -1) return false;
  wanted.splice(idx, 1);
  for (const item of placed) {
    const j = wanted.indexOf(item);
    if (j === -1) return false;
    wanted.splice(j, 1);
  }
  return true;
}

export function plateIsComplete(state) {
  const order = orderForPlate(state);
  if (!order) return false;
  const wanted = [...order.recipe.items].sort();
  const placed = [...state.plate.items].sort();
  return wanted.length === placed.length && wanted.every((v, i) => v === placed[i]);
}

// What the ticket still needs, for the "missing" dots on the order board.
export function missingItems(state, order) {
  const wanted = [...order.recipe.items];
  const isTarget = state.plate.targetOrderId === order.id || state.selectedOrderId === order.id;
  const placed = isTarget ? state.plate.items : [];
  for (const item of placed) {
    const j = wanted.indexOf(item);
    if (j !== -1) wanted.splice(j, 1);
  }
  return wanted;
}

export function ingredientLabel(id) {
  return INGREDIENT_BY_ID[id]?.name ?? id;
}
