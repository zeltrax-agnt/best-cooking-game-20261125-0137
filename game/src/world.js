// world.js — the game state: score, combo, shift clock, and every interaction.
// The loop is: grab an ingredient, transform it (chop / grill / stove), stack it
// on the assembly plate, carry the plate to the window before patience runs out.
import {
  SHIFT_SECONDS, RUSH_AT, INTERACT_RANGE, CHOP_SECONDS, GRILL_SECONDS,
  GRILL_BURN_AFTER, STOVE_SECONDS, INGREDIENTS, TRANSFORMS, FINISHED_NAMES,
} from './config.js';
import { Orders } from './orders.js';
import { Player } from './player.js';
import { STATIONS, stationById, createKitchenState, nearestStation } from './stations.js';
import { Audio } from './audio.js';

export const PHASE = { TITLE: 'title', PLAYING: 'playing', PAUSED: 'paused', OVER: 'over' };

export class World {
  constructor() {
    this.audio = new Audio();
    this.player = new Player();
    this.orders = new Orders();
    this.kitchen = createKitchenState();
    this.phase = PHASE.TITLE;
    this.score = 0;
    this.served = 0;
    this.expiredCount = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.timeLeft = SHIFT_SECONDS;
    this.elapsed = 0;
    this.rush = false;
    this.rushAnnounced = false;
    this.toast = '';
    this.toastTimer = 0;
    this.flash = 0; // red flash on an expired order
    this.shake = 0;
    this.lastServeAt = 0;
    // A station the player clicked while out of range: walk there, then use it.
    this.pendingInteract = null;
  }

  reset() {
    this.player.reset();
    this.orders.reset();
    this.kitchen = createKitchenState();
    this.score = 0;
    this.served = 0;
    this.expiredCount = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.timeLeft = SHIFT_SECONDS;
    this.elapsed = 0;
    this.rush = false;
    this.rushAnnounced = false;
    this.toast = '';
    this.toastTimer = 0;
    this.flash = 0;
    this.shake = 0;
    this.lastServeAt = 0;
    this.pendingInteract = null;
    this.phase = PHASE.PLAYING;
    this.audio.startMusic(false);
  }

  say(text, seconds = 2.2) { this.toast = text; this.toastTimer = seconds; }

  solids() {
    // Every station rect is solid; the chef walks the open floor between them.
    return STATIONS.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h }));
  }

  update(dt, input) {
    if (this.phase === PHASE.TITLE) {
      if (input.wasPressed('enter') || input.consumeClick()) this.reset();
      return;
    }
    if (this.phase === PHASE.OVER) {
      if (input.wasPressed('r') || input.wasPressed('enter') || input.consumeClick()) this.reset();
      return;
    }
    if (input.wasPressed('p') || input.wasPressed('escape')) {
      this.phase = this.phase === PHASE.PAUSED ? PHASE.PLAYING : PHASE.PAUSED;
      return;
    }
    if (this.phase === PHASE.PAUSED) return;
    if (input.wasPressed('m')) this.say(this.audio.toggleMute() ? 'Sound off' : 'Sound on');

    this.elapsed += dt;
    this.timeLeft = Math.max(0, SHIFT_SECONDS - this.elapsed);
    if (this.toastTimer > 0) this.toastTimer -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.shake > 0) this.shake -= dt;
    if (input.hasKeys()) this.pendingInteract = null;

    if (!this.rush && this.timeLeft <= RUSH_AT) {
      this.rush = true;
      this.orders.rush = true;
      this.say('DINNER RUSH! Orders come faster — keep moving!', 3);
      this.audio.rush();
    }
    if (this.timeLeft <= 0) {
      this.phase = PHASE.OVER;
      this.audio.stopMusic();
      this.audio.gameOver();
      return;
    }

    this.orders.update(dt, (o) => this.onOrderExpired(o));
    this.tickCooking(dt);
    this.player.update(dt, input, this.solids());
    this.handleInput(dt, input);
  }

  onOrderExpired(order) {
    this.expiredCount += 1;
    this.combo = 0;
    this.flash = 0.6;
    this.shake = 0.4;
    this.say(`Order #${order.id} walked out — ${order.recipe.name} lost!`, 2.5);
    this.audio.expire();
  }

  tickCooking(dt) {
    const tick = (slots, cookSeconds, burnAfter, onDone) => {
      for (const slot of slots) {
        if (!slot.item) continue;
        slot.progress += dt;
        if (!slot.done && slot.progress >= cookSeconds) {
          slot.done = true;
          onDone(slot);
        }
        if (slot.done && !slot.burnt && slot.progress >= burnAfter) {
          slot.burnt = true;
          this.say('Something burned! Bin it and start over.', 2.5);
          this.audio.error();
        }
      }
    };
    tick(this.kitchen.grill, GRILL_SECONDS, GRILL_BURN_AFTER, (slot) => {
      if (!slot.announced) { slot.announced = true; this.say('Patty ready on the grill!', 1.8); this.audio.ready(); }
    });
    tick(this.kitchen.stove, STOVE_SECONDS, GRILL_BURN_AFTER + 4, (slot) => {
      if (!slot.announced) { slot.announced = true; this.say('Soup is ready on the stove!', 1.8); this.audio.ready(); }
    });
  }

  // The station the chef is standing at, if any.
  currentStation() {
    return nearestStation(this.player.x, this.player.y, INTERACT_RANGE);
  }

  // The station a point on the screen belongs to (the click's station), if any.
  stationAtPoint(mx, my) {
    const pad = 12;
    return STATIONS.find((s) => mx >= s.x - pad && mx <= s.x + s.w + pad && my >= s.y - pad && my <= s.y + s.h + pad) ?? null;
  }

  handleInput(dt, input) {
    const station = this.currentStation();
    const p = this.player;

    // Number keys grab an ingredient at the fridge / produce crates.
    if (station && (station.id === 'fridge' || station.id === 'produce')) {
      for (const [id, ing] of Object.entries(INGREDIENTS)) {
        if (input.wasPressed(ing.key)) this.grabIngredient(id, station.id);
      }
    }

    // Clicks: the click's own point decides what it means — a click on a station
    // is for that station, never for whatever station the chef happens to stand
    // at; a click on open floor is just a walk order. Clicking a station out of
    // range walks the chef to its anchor and uses it on arrival.
    if (input.consumeClick()) {
      const mx = input.mouse.x, my = input.mouse.y;
      const clicked = this.stationAtPoint(mx, my);
      if (clicked) {
        input.walkTarget = { ...clicked.anchor };
        const inRange = p.distTo(clicked.anchor.x, clicked.anchor.y) <= INTERACT_RANGE;
        if (clicked.id === 'fridge' || clicked.id === 'produce') {
          const hit = this.crateAt(mx, my, clicked.id);
          if (hit) {
            if (inRange) this.grabIngredient(hit, clicked.id);
            else this.pendingInteract = { type: 'crate', station: clicked.id, item: hit };
            return;
          }
        }
        if (inRange) this.interact(clicked);
        else this.pendingInteract = { type: 'station', id: clicked.id };
      }
      // No station under the click: walkTarget (set by the pointer) stands.
    }

    // A pending click-to-use fires once the chef arrives in range.
    if (this.pendingInteract) {
      const s = this.currentStation();
      if (s) {
        if (this.pendingInteract.type === 'station' && s.id === this.pendingInteract.id) {
          this.pendingInteract = null;
          this.interact(s);
        } else if (this.pendingInteract.type === 'crate' && s.id === this.pendingInteract.station) {
          const job = this.pendingInteract;
          this.pendingInteract = null;
          this.grabIngredient(job.item, job.station);
        }
      }
    }

    // Hold E at the chopping board to chop; tap E elsewhere to interact.
    if (station && station.id === 'board') {
      if (input.keys.has('e') && p.carrying && TRANSFORMS[p.carrying]?.station === 'board') {
        this.chopTick(dt);
      } else if (this.kitchen.chopProgress > 0 && !input.keys.has('e')) {
        this.kitchen.chopProgress = 0; // letting go loses the chop rhythm
      }
      if (input.wasPressed('e')) this.interact(station);
      return;
    }
    if (input.wasPressed('e') && station) this.interact(station);
  }

  // Crates are drawn on the fridge / produce counters; returns the ingredient id.
  crateAt(mx, my, stationId) {
    const s = stationById(stationId);
    const ids = stationId === 'fridge' ? ['bun', 'patty', 'cheese', 'pot'] : ['lettuce', 'tomato'];
    const slotW = s.w / ids.length;
    if (mx < s.x || mx > s.x + s.w || my < s.y || my > s.y + s.h) return null;
    return ids[Math.min(ids.length - 1, Math.floor((mx - s.x) / slotW))];
  }

  grabIngredient(id, stationId) {
    const p = this.player;
    const allowed = stationId === 'fridge'
      ? ['bun', 'patty', 'cheese', 'pot']
      : ['lettuce', 'tomato'];
    if (!allowed.includes(id)) { this.audio.error(); return; }
    if (p.carrying) { this.say('Hands full — serve or bin what you carry first.', 1.8); this.audio.error(); return; }
    p.carrying = id;
    this.say(`${INGREDIENTS[id].name} in hand.`, 1.4);
    this.audio.grab();
  }

  chopTick(dt) {
    const k = this.kitchen;
    if (!k.chopItem) k.chopItem = this.player.carrying;
    k.chopProgress += dt / CHOP_SECONDS;
    if (Math.random() < dt * 6) this.audio.chop();
    if (k.chopProgress >= 1) {
      const done = TRANSFORMS[k.chopItem].result;
      this.player.carrying = done;
      k.chopProgress = 0;
      k.chopItem = null;
      this.say(`${FINISHED_NAMES[done]} — nice and even.`, 1.6);
      this.audio.ready();
    }
  }

  interact(station) {
    const p = this.player;
    const k = this.kitchen;
    switch (station.id) {
      case 'fridge':
      case 'produce':
        this.say(station.id === 'fridge'
          ? 'Fridge: press 1 bun, 2 patty, 5 cheese, 6 soup pot — or click a crate.'
          : 'Produce: press 3 lettuce, 4 tomato — or click a crate.', 2.6);
        break;
      case 'board': {
        if (!p.carrying) { this.say('Bring lettuce or tomato to the board first.', 1.8); this.audio.error(); break; }
        if (TRANSFORMS[p.carrying]?.station !== 'board') {
          this.say(`${FINISHED_NAMES[p.carrying] ?? p.carrying} does not need chopping.`, 1.8);
          this.audio.error();
        } else {
          this.say('Hold E to chop…', 1.2);
        }
        break;
      }
      case 'grill': this.cookInteract(k.grill, 'patty', 'grill'); break;
      case 'stove': this.cookInteract(k.stove, 'pot', 'stove'); break;
      case 'island': this.islandInteract(); break;
      case 'window': this.serveInteract(); break;
      case 'bin':
        if (p.carrying) {
          this.say(`Binned the ${FINISHED_NAMES[p.carrying] ?? p.carrying}.`, 1.4);
          p.carrying = null;
          this.audio.place();
        } else if (k.plate.length) {
          k.plate = [];
          this.say('Plate cleared.', 1.4);
          this.audio.place();
        } else { this.say('Nothing to throw away.', 1.2); }
        break;
      default: break;
    }
  }

  cookInteract(slots, rawId, stationName) {
    const p = this.player;
    const k = this.kitchen;
    // Take a finished item off first.
    const ready = slots.find((s) => s.item && s.done && !s.burnt);
    if (ready && !p.carrying) {
      p.carrying = TRANSFORMS[ready.item].result;
      ready.item = null; ready.progress = 0; ready.done = false; ready.announced = false;
      this.say(`${FINISHED_NAMES[p.carrying]} in hand — plate it up!`, 1.8);
      this.audio.grab();
      return;
    }
    const burnt = slots.find((s) => s.item && s.burnt);
    if (burnt && !p.carrying) {
      p.carrying = null;
      burnt.item = null; burnt.progress = 0; burnt.done = false; burnt.burnt = false; burnt.announced = false;
      this.say('Burnt food binned — the slot is free again.', 1.8);
      this.audio.place();
      return;
    }
    // Place a raw item on a free slot.
    if (p.carrying === rawId) {
      const free = slots.find((s) => !s.item);
      if (!free) { this.say(`The ${stationName} is full.`, 1.6); this.audio.error(); return; }
      free.item = rawId; free.progress = 0; free.done = false; free.burnt = false; free.announced = false;
      p.carrying = null;
      this.say(`${INGREDIENTS[rawId].name} on the ${stationName} — watch the timer!`, 1.8);
      this.audio.sizzleStart();
      return;
    }
    if (p.carrying) { this.say(`The ${stationName} only takes ${INGREDIENTS[rawId].name}.`, 1.8); this.audio.error(); return; }
    this.say(`Nothing cooking — bring a ${INGREDIENTS[rawId].name}.`, 1.6);
  }

  islandInteract() {
    const p = this.player;
    const k = this.kitchen;
    if (p.carrying === 'plate') { this.say('Already carrying the plate — to the window!', 1.4); return; }
    if (p.carrying) {
      const item = p.carrying;
      if (k.plate.length >= 4) { this.say('The plate is full.', 1.5); this.audio.error(); return; }
      // A soup is a dish on its own: it never joins a plate.
      if (item === 'soup' || k.plate.includes('soup')) {
        this.say('Soup is served on its own — take it straight to the window.', 2);
        this.audio.error();
        return;
      }
      k.plate.push(item);
      p.carrying = null;
      this.say(`${FINISHED_NAMES[item]} on the plate.`, 1.4);
      this.audio.place();
      return;
    }
    // Empty hands: pick the plate up.
    if (k.plate.length) {
      p.carrying = 'plate';
      this.say('Plate in hand — serve it at the window!', 1.6);
      this.audio.grab();
    } else {
      this.say('Bring ingredients here to build a dish.', 1.6);
    }
  }

  serveInteract() {
    const p = this.player;
    const k = this.kitchen;
    let items = null;
    if (p.carrying === 'soup') items = ['soup'];
    else if (p.carrying === 'plate') items = [...k.plate];
    else { this.say('Bring a finished plate (or a soup) to the window.', 2); this.audio.error(); return; }

    const order = this.orders.matchFor(items);
    if (!order) {
      this.say('No order wants this dish — check the board!', 2);
      this.audio.error();
      return;
    }
    const tip = this.orders.tipFor(order);
    const mult = 1 + Math.min(this.combo, 8) * 0.25;
    const earned = Math.round((order.recipe.price + tip) * mult);
    this.score += earned;
    this.served += 1;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.orders.remove(order);
    if (p.carrying === 'plate') k.plate = [];
    p.carrying = null;
    this.lastServeAt = this.elapsed;
    this.say(`Served ${order.recipe.name} — +$${earned}${this.combo > 1 ? ` (combo x${this.combo})` : ''}!`, 2.4);
    this.audio.serve();
  }
}
