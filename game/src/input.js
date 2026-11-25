// input.js — mouse and keyboard: where a click lands, what a key does.
// Clicks resolve against the layout rectangles render.js publishes, so the
// art and the hit-testing can never drift apart.

import { INGREDIENTS, INGREDIENT_BY_ID, STATIONS } from './data.js';
import { HIT, LAYOUT, hitRects } from './render.js';
import { collectStation, homeStationFor, startStation } from './stations.js';
import { orderForPlate, plateAccepts, plateIsComplete } from './orders.js';
import { serveOrder, setMessage, startNextDay } from './state.js';
import { setMuted, sfx, unlockAudio } from './audio.js';

function inside(r, x, y) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function canvasPos(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * 1280,
    y: ((clientY - rect.top) / rect.height) * 720,
  };
}

// Pick up a raw pantry ingredient (or swap the hand's raw item back).
export function pickupIngredient(state, index) {
  const ing = INGREDIENTS[index];
  if (!ing) return;
  if (state.hand) {
    setMessage(state, 'Hands full — place or trash what you hold first (T).', 2);
    sfx.error();
    return;
  }
  state.hand = { kind: 'raw', id: ing.id };
  sfx.pickup();
  setMessage(state, `${ing.name} picked up — send it to the ${STATIONS[ing.station].name} (${STATIONS[ing.station].key}).`, 2);
}

export function sendHeldToStation(state, stationId) {
  const msg = startStation(state, stationId);
  if (msg) {
    setMessage(state, msg, 2.4);
    sfx.error();
  } else {
    sfx.sizzle();
  }
}

// Serve the plate when it completes the targeted order.
export function tryServe(state) {
  const order = orderForPlate(state);
  if (!order) {
    setMessage(state, 'No orders to serve yet.', 2);
    return;
  }
  if (!plateIsComplete(state)) {
    setMessage(state, `The plate is not finished — ${order.recipe.name} still needs ${order.recipe.items.filter((i) => !state.plate.items.includes(i)).map((i) => INGREDIENT_BY_ID[i].name).join(', ')}.`, 2.4);
    sfx.error();
    return;
  }
  serveOrder(state, order);
  sfx.serve();
  sfx.coin();
  state.orders = state.orders.filter((o) => o.id !== order.id);
  state.plate = { items: [], targetOrderId: null };
  state.selectedOrderId = state.orders[0]?.id ?? null;
}

// Place the held prepared item on the plate, or remove a plated item.
export function clickPlate(state, x, y) {
  const order = orderForPlate(state);
  if (state.hand?.kind === 'done') {
    if (!order) {
      setMessage(state, 'No order to build for — wait for a customer.', 2);
      sfx.error();
      return;
    }
    if (!plateAccepts(state, state.hand.id)) {
      setMessage(state, `${INGREDIENT_BY_ID[state.hand.id].name} is not part of ${order.recipe.name}. Click a different ticket to change the target.`, 2.6);
      sfx.error();
      return;
    }
    state.plate.items.push(state.hand.id);
    state.plate.targetOrderId = order.id;
    state.hand = null;
    sfx.place();
    if (plateIsComplete(state)) {
      setMessage(state, `${order.recipe.name} is complete — serve it! (Space)`, 2.4);
      sfx.ding();
    }
    return;
  }
  // No prepared item in hand: clicking a plated item takes it back off.
  if (state.plate.items.length > 0 && !state.hand) {
    const removed = state.plate.items.pop();
    state.hand = { kind: 'done', id: removed };
    sfx.pickup();
    setMessage(state, `Took ${INGREDIENT_BY_ID[removed].name} off the plate.`, 1.6);
  }
}

export function handleClick(state, canvas, clientX, clientY, onStart) {
  unlockAudio();
  const { x, y } = canvasPos(canvas, clientX, clientY);
  if (state.phase === 'title') { onStart(); return; }
  if (state.phase === 'dayEnd') { startNextDay(state); sfx.rush(); return; }
  if (state.phase === 'gameOver') { onStart(); return; }
  if (state.paused) return;
  const rects = hitRects();
  // Order tickets: select the target order.
  for (let i = 0; i < state.orders.length; i++) {
    if (inside(HIT.orderTicket(i), x, y)) {
      state.selectedOrderId = state.orders[i].id;
      state.plate.targetOrderId = state.orders[i].id;
      sfx.click();
      setMessage(state, `Building ${state.orders[i].recipe.name} for ${state.orders[i].customer}.`, 1.8);
      return;
    }
  }
  // Pantry bins.
  for (let i = 0; i < rects.pantry.length; i++) {
    if (inside(rects.pantry[i], x, y)) { pickupIngredient(state, i); return; }
  }
  // Stations: collect a finished item, or start cooking the held raw item.
  for (const id of Object.keys(rects.stations)) {
    if (inside(rects.stations[id], x, y)) {
      const job = state.stations[id].busy;
      if (job?.done) {
        const msg = collectStation(state, id);
        if (msg) { setMessage(state, msg, 2); sfx.error(); } else sfx.pickup();
      } else if (job?.burnt) {
        collectStation(state, id);
        sfx.click();
      } else if (state.hand?.kind === 'raw') {
        sendHeldToStation(state, id);
      } else {
        const msg = collectStation(state, id);
        if (msg) { setMessage(state, msg, 2); sfx.error(); }
      }
      return;
    }
  }
  // Serve button.
  if (inside(HIT.serve, x, y)) { tryServe(state); return; }
  // Plate.
  if (inside(HIT.plate, x, y)) { clickPlate(state, x, y); return; }
}

export function handleKey(state, key, onStart) {
  const k = key.toLowerCase();
  if (state.phase === 'title' && (k === 'enter' || k === ' ')) { unlockAudio(); onStart(); return; }
  if (state.phase === 'dayEnd' && k === 'enter') { startNextDay(state); sfx.rush(); return; }
  if (state.phase === 'gameOver' && k === 'enter') { onStart(); return; }
  if (state.phase !== 'playing') return;
  if (k === 'p') {
    state.paused = !state.paused;
    sfx.click();
    return;
  }
  if (k === 'm') {
    state.muted = !state.muted;
    setMuted(state.muted);
    setMessage(state, state.muted ? 'Sound off.' : 'Sound on.', 1.4);
    return;
  }
  if (state.paused) return;
  if (k >= '1' && k <= '9') { pickupIngredient(state, Number(k) - 1); return; }
  if (k === '0') { pickupIngredient(state, 9); return; }
  if (k === 'c' || k === 'g' || k === 's' || k === 'f') {
    const map = { c: 'chop', g: 'grill', s: 'simmer', f: 'fry' };
    if (state.hand?.kind === 'raw') sendHeldToStation(state, map[k]);
    else setMessage(state, 'Pick up a raw ingredient first.', 1.6);
    return;
  }
  if (k === ' ') { tryServe(state); return; }
  if (k === 't') {
    if (state.hand) {
      setMessage(state, `Trashed the ${INGREDIENT_BY_ID[state.hand.id].name}.`, 1.6);
      state.hand = null;
      sfx.error();
    }
    return;
  }
  if (k === 'x' && state.plate.items.length > 0 && !state.hand) {
    const removed = state.plate.items.pop();
    state.hand = { kind: 'done', id: removed };
    sfx.pickup();
  }
  // Hint: pressing a station key with a held item also shows its home.
  if (state.hand?.kind === 'raw') {
    const home = homeStationFor(state.hand.id);
    if (home) setMessage(state, `${INGREDIENT_BY_ID[state.hand.id].name} goes to the ${STATIONS[home].name} (${STATIONS[home].key}).`, 1.4);
  }
}
