// stations.js — the four workstations: chop, grill, simmer, fry. A raw
// ingredient goes in, a timer runs, a prepared ingredient comes out — unless
// the chef forgets it and it burns.

import { INGREDIENT_BY_ID, STATIONS } from './data.js';
import { burnItem, setMessage } from './state.js';

// How long a finished item may sit before it burns (seconds).
export const BURN_AFTER = 6;

export function stationAccepts(stationId, ingredientId) {
  const ing = INGREDIENT_BY_ID[ingredientId];
  return !!ing && ing.station === stationId;
}

// Start cooking the held raw ingredient at a station. Returns a message for
// the chef, or null when the station cannot take it.
export function startStation(state, stationId) {
  const station = state.stations[stationId];
  const hand = state.hand;
  if (!hand || hand.kind !== 'raw') return 'Pick up a raw ingredient first (click a pantry bin).';
  if (station.busy) return `${STATIONS[stationId].name} is busy — wait for it to finish.`;
  if (!stationAccepts(stationId, hand.id)) {
    return `${INGREDIENT_BY_ID[hand.id].name} does not go on the ${STATIONS[stationId].name} — it needs the ${STATIONS[INGREDIENT_BY_ID[hand.id].station].name}.`;
  }
  station.busy = {
    id: hand.id,
    progress: 0,
    seconds: STATIONS[stationId].seconds,
    done: false,
    doneFor: 0,
    burnt: false,
  };
  state.hand = null;
  return null;
}

// Tick every station: advance progress, mark done, burn what sits too long.
export function tickStations(state, dt) {
  const events = [];
  for (const [id, station] of Object.entries(state.stations)) {
    const job = station.busy;
    if (!job) continue;
    if (!job.done) {
      job.progress += dt / job.seconds;
      if (job.progress >= 1) {
        job.progress = 1;
        job.done = true;
        job.doneFor = 0;
        events.push({ type: 'stationDone', station: id, ingredient: job.id });
      }
    } else if (!job.burnt) {
      job.doneFor += dt;
      if (job.doneFor >= BURN_AFTER) {
        job.burnt = true;
        burnItem(state, id, job.id);
        events.push({ type: 'burnt', station: id, ingredient: job.id });
      }
    }
  }
  return events;
}

// Click a station: collect a finished item into the hand, or clear a burnt one.
export function collectStation(state, stationId) {
  const station = state.stations[stationId];
  const job = station.busy;
  if (!job) return 'Nothing cooking here yet.';
  if (job.burnt) {
    station.busy = null;
    setMessage(state, 'Cleared the burnt food. Keep an eye on the timers!', 2);
    return null;
  }
  if (!job.done) {
    return `Still ${STATIONS[stationId].gerund.toLowerCase()} — ${Math.ceil((1 - job.progress) * job.seconds)}s to go.`;
  }
  if (state.hand) return 'Your hands are full — place what you hold first.';
  state.hand = { kind: 'done', id: job.id };
  station.busy = null;
  return null;
}

// The station a held raw ingredient belongs to, for the hint line.
export function homeStationFor(ingredientId) {
  return INGREDIENT_BY_ID[ingredientId]?.station ?? null;
}
