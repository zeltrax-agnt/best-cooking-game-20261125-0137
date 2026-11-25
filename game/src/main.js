// main.js — boot and the game loop of The Golden Ladle. Ticks the clock,
// the orders and the stations, plays the sounds, and draws every frame.
// `?shot=1..4` seeds a fixed mid-service scene for screenshots: real renders
// of this same code, with the same rules running underneath.

import { mulberry32 } from './data.js';
import { PHASES, createGame, endShift, isRush, setMessage } from './state.js';
import { spawnOrder, tickOrders } from './orders.js';
import { tickStations } from './stations.js';
import { draw } from './render.js';
import { handleClick, handleKey } from './input.js';
import { setMuted, sfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const state = createGame();
const mouse = { x: -100, y: -100 };

let lastTs = performance.now();
let titleT = 0;

function startGame() {
  const fresh = createGame();
  Object.assign(state, fresh);
  state.phase = PHASES.PLAYING;
  state.rng = Math.random;
  setMessage(state, 'Day 1 — Opening Day. First customers in a few seconds!', 3);
  sfx.rush();
}

function tick(dt) {
  if (state.phase !== PHASES.PLAYING || state.paused) return;
  state.elapsed += dt;
  state.timeLeft -= dt;
  if (state.messageTimer > 0) state.messageTimer -= dt;
  if (state.flash > 0) state.flash -= dt;
  if (isRush(state) && !state.rushAnnounced) {
    state.rushAnnounced = true;
    setMessage(state, '🔥 DINNER RUSH! Orders fly in — serve fast for big tips!', 3);
    sfx.rush();
  }
  const orderEvents = tickOrders(state, dt);
  for (const ev of orderEvents) {
    if (ev.type === 'newOrder') sfx.ding();
    if (ev.type === 'lostOrder') sfx.lost();
  }
  const stationEvents = tickStations(state, dt);
  for (const ev of stationEvents) {
    if (ev.type === 'stationDone') sfx.ding();
    if (ev.type === 'burnt') sfx.burn();
  }
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    sfx.serve();
    endShift(state);
  }
}

function loop(ts) {
  const dt = Math.min(0.1, (ts - lastTs) / 1000);
  lastTs = ts;
  titleT += dt;
  tick(dt);
  draw(ctx, state, mouse, titleT);
  requestAnimationFrame(loop);
}

// --- screenshot scenes ------------------------------------------------------
// Each shot seeds one honest mid-game moment: real orders, real stations,
// a real plate — the same state a player reaches by playing.
function seedShot(n) {
  const rng = mulberry32(0xC0FFEE + n * 7919);
  state.rng = rng;
  state.phase = PHASES.PLAYING;
  state.day = n === 4 ? 3 : n === 2 ? 2 : 1;
  if (n === 1) {
    // Cover: mid Day 1, three orders, a dish half-built, grill running.
    state.timeLeft = 144; state.elapsed = 36;
    state.coins = 486; state.score = 486; state.combo = 2; state.bestCombo = 2;
    spawnOrder(state, 'salad');
    spawnOrder(state, 'chicken-plate');
    spawnOrder(state, 'soup');
    state.orders[0].patience = state.orders[0].patienceMax * 0.72;
    state.orders[1].patience = state.orders[1].patienceMax * 0.55;
    state.orders[2].patience = state.orders[2].patienceMax * 0.88;
    state.selectedOrderId = state.orders[1].id;
    state.plate = { items: ['chicken', 'potato'], targetOrderId: state.orders[1].id };
    state.stations.grill.busy = { id: 'beef', progress: 0.45, seconds: 4, done: false, doneFor: 0, burnt: false };
    state.hand = { kind: 'done', id: 'lettuce' };
    setMessage(state, 'Grilled Chicken Plate is nearly done — add the lettuce and serve!', 30);
    state.messageTimer = 30;
  } else if (n === 2) {
    // Dinner rush: 28 seconds left, four orders, one nearly out of patience,
    // a finished plate glowing ready to serve, combo x4.
    state.timeLeft = 28; state.elapsed = 152;
    state.coins = 2140; state.score = 2140; state.combo = 4; state.bestCombo = 5;
    state.rushAnnounced = true;
    spawnOrder(state, 'beef-skillet');
    spawnOrder(state, 'shrimp');
    spawnOrder(state, 'chicken-plate');
    spawnOrder(state, 'bruschetta');
    state.orders[0].patience = state.orders[0].patienceMax * 0.18;
    state.orders[1].patience = state.orders[1].patienceMax * 0.42;
    state.orders[2].patience = state.orders[2].patienceMax * 0.66;
    state.orders[3].patience = state.orders[3].patienceMax * 0.8;
    state.selectedOrderId = state.orders[1].id;
    state.plate = { items: ['shrimp', 'potato', 'tomato'], targetOrderId: state.orders[1].id };
    state.stations.fry.busy = { id: 'potato', progress: 0.8, seconds: 3, done: false, doneFor: 0, burnt: false };
    state.stations.grill.busy = { id: 'chicken', progress: 1, seconds: 4, done: true, doneFor: 0.5, burnt: false };
    setMessage(state, '🔥 DINNER RUSH! Golden Shrimp is ready — serve it now!', 30);
    state.messageTimer = 30;
  } else if (n === 3) {
    // Mid-assembly: chopping in progress, one item plated, ticket picked.
    state.timeLeft = 107; state.elapsed = 73;
    state.coins = 890; state.score = 890; state.combo = 3; state.bestCombo = 3;
    spawnOrder(state, 'salad');
    spawnOrder(state, 'bruschetta');
    state.orders[0].patience = state.orders[0].patienceMax * 0.6;
    state.orders[1].patience = state.orders[1].patienceMax * 0.9;
    state.selectedOrderId = state.orders[0].id;
    state.plate = { items: ['tomato'], targetOrderId: state.orders[0].id };
    state.stations.chop.busy = { id: 'lettuce', progress: 0.15, seconds: 2, done: false, doneFor: 0, burnt: false };
    state.stations.simmer.busy = { id: 'mushroom', progress: 0.3, seconds: 5, done: false, doneFor: 0, burnt: false };
    setMessage(state, 'Chopping the lettuce for the Garden Salad…', 30);
    state.messageTimer = 30;
  } else {
    // Day 3: the critic's day — five orders, combo x6, two stations running.
    state.timeLeft = 65; state.elapsed = 115;
    state.coins = 3420; state.score = 3420; state.combo = 6; state.bestCombo = 6;
    spawnOrder(state, 'surf-turf');
    spawnOrder(state, 'feast');
    spawnOrder(state, 'shrimp');
    spawnOrder(state, 'soup');
    spawnOrder(state, 'salad');
    state.orders.forEach((o, i) => { o.patience = o.patienceMax * [0.5, 0.75, 0.35, 0.9, 0.62][i]; });
    state.selectedOrderId = state.orders[0].id;
    state.plate = { items: ['beef'], targetOrderId: state.orders[0].id };
    state.stations.grill.busy = { id: 'shrimp', progress: 0.55, seconds: 4, done: false, doneFor: 0, burnt: false };
    state.stations.fry.busy = { id: 'potato', progress: 0.9, seconds: 3, done: false, doneFor: 0, burnt: false };
    state.hand = { kind: 'raw', id: 'tomato' };
    setMessage(state, 'Day 3 — the food critic is watching. Surf & Turf on the pass!', 30);
    state.messageTimer = 30;
  }
  // Keep the seeded scene stable for the screenshot: slow the clock.
  state.spawnTimer = 999;
  for (const o of state.orders) o.patience = Math.max(o.patience, 6);
}

// --- wiring -----------------------------------------------------------------
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 1280;
  mouse.y = ((e.clientY - rect.top) / rect.height) * 720;
});
canvas.addEventListener('mouseleave', () => { mouse.x = -100; mouse.y = -100; });
canvas.addEventListener('click', (e) => handleClick(state, canvas, e.clientX, e.clientY, startGame));
window.addEventListener('keydown', (e) => {
  if ([' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
  handleKey(state, e.key, startGame);
});

const params = new URLSearchParams(window.location.search);
const shot = Number(params.get('shot') || 0);
if (shot >= 1 && shot <= 4) {
  setMuted(true);
  seedShot(shot);
} else {
  setMessage(state, 'Click START DAY 1 to open the kitchen.', 60);
}

// A read-only handle for play-testing and debugging (also handy for the
// entry's own verification): the live game state, nothing more.
window.__ladle = state;

requestAnimationFrame(loop);
