// state.js — the single game state: shift clock, coins, combo, day, orders,
// stations, the plate and the chef's hand. Every other module reads or
// mutates this one object, so a saved state is the whole game.

import { DAYS, SHIFT_SECONDS, TOTAL_DAYS, comboMultiplier, recipesForDay } from './data.js';

export const PHASES = {
  TITLE: 'title',
  PLAYING: 'playing',
  DAY_END: 'dayEnd',
  GAME_OVER: 'gameOver',
};

export function createGame() {
  return {
    phase: PHASES.TITLE,
    day: 1,
    // Shift clock counts down from SHIFT_SECONDS; the last 30 s are the rush.
    timeLeft: SHIFT_SECONDS,
    elapsed: 0,
    coins: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    lost: 0,
    burnt: 0,
    tipsEarned: 0,
    orders: [],
    nextOrderId: 1,
    spawnTimer: 4,
    // The plate: prepared items placed for the targeted order, or null.
    plate: { items: [], targetOrderId: null },
    hand: null, // { kind: 'raw'|'done', id } or null
    stations: {
      chop: { busy: null },
      grill: { busy: null },
      simmer: { busy: null },
      fry: { busy: null },
    },
    selectedOrderId: null,
    message: '',
    messageTimer: 0,
    flash: 0, // screen flash timer for a serve / a lost order
    flashColor: '#ffffff',
    muted: false,
    paused: false,
    rushAnnounced: false,
    // End-of-day summary, filled when a shift ends.
    daySummary: null,
    rng: Math.random,
  };
}

export function dayConfig(state) {
  return DAYS[state.day - 1];
}

export function isRush(state) {
  return state.phase === PHASES.PLAYING && state.timeLeft <= 30 && state.timeLeft > 0;
}

export function availableRecipes(state) {
  return recipesForDay(state.day);
}

export function setMessage(state, text, seconds = 2.2) {
  state.message = text;
  state.messageTimer = seconds;
}

// Serving: score = recipe base x combo multiplier + patience tip.
// A serve keeps the combo alive; a lost order resets it to zero.
export function serveOrder(state, order) {
  const patienceLeft = Math.max(0, order.patience / order.patienceMax);
  const tip = Math.round(order.recipe.base * 0.35 * patienceLeft * dayConfig(state).tipRate);
  const mult = comboMultiplier(state.combo + 1);
  const earned = Math.round(order.recipe.base * mult) + tip;
  state.coins += earned;
  state.score += earned;
  state.tipsEarned += tip;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.served += 1;
  state.flash = 0.35;
  state.flashColor = '#ffd23e';
  const comboText = state.combo > 1 ? `  Combo x${state.combo} (${mult.toFixed(2)}x)!` : '';
  setMessage(state, `Served ${order.recipe.name}! +${earned} coins (tip +${tip}).${comboText}`, 2.6);
  return earned;
}

export function loseOrder(state, order) {
  state.lost += 1;
  state.combo = 0;
  state.flash = 0.4;
  state.flashColor = '#d9392b';
  setMessage(state, `${order.customer} walked out — ${order.recipe.name} was too slow! Combo lost.`, 2.6);
}

export function burnItem(state, stationId, ingredientId) {
  state.burnt += 1;
  state.combo = 0;
  setMessage(state, `The ${ingredientId} burned on the ${stationId}! Combo lost — click the station to clear it.`, 2.6);
}

// End the shift, build the day summary, and advance (or finish the game).
export function endShift(state) {
  const dayCoins = state.coins - (state.daySummary?.coinsBefore ?? 0);
  state.daySummary = {
    day: state.day,
    served: state.served,
    lost: state.lost,
    coins: state.coins,
    coinsBefore: state.coins - dayCoins,
    bestCombo: state.bestCombo,
    tips: state.tipsEarned,
  };
  state.orders = [];
  state.plate = { items: [], targetOrderId: null };
  state.hand = null;
  for (const key of Object.keys(state.stations)) state.stations[key].busy = null;
  if (state.day >= TOTAL_DAYS) {
    state.phase = PHASES.GAME_OVER;
  } else {
    state.phase = PHASES.DAY_END;
  }
}

export function startNextDay(state) {
  state.day += 1;
  state.timeLeft = SHIFT_SECONDS;
  state.elapsed = 0;
  state.spawnTimer = 4;
  state.rushAnnounced = false;
  state.orders = [];
  state.nextOrderId = 1;
  state.plate = { items: [], targetOrderId: null };
  state.hand = null;
  for (const key of Object.keys(state.stations)) state.stations[key].busy = null;
  state.phase = PHASES.PLAYING;
  setMessage(state, `Day ${state.day} — ${dayConfig(state).name}. ${dayConfig(state).unlockNote}!`, 3.2);
}

export function chefTitle(state) {
  if (state.score >= 5200) return 'Michelin Star Chef';
  if (state.score >= 3800) return 'Head Chef';
  if (state.score >= 2400) return 'Sous Chef';
  if (state.score >= 1200) return 'Line Cook';
  return 'Kitchen Hand';
}
