// render.js — every pixel of The Golden Ladle: the bistro kitchen, the order
// board, the pantry, the four stations, the plating pass and the HUD. All
// art is drawn fresh on a 2D canvas — original shapes, no images, no fonts
// from the network.

import { INGREDIENTS, INGREDIENT_BY_ID, RECIPES, STATIONS, STATION_ORDER, SHIFT_SECONDS, RUSH_SECONDS } from './data.js';
import { chefTitle, dayConfig, isRush } from './state.js';
import { missingItems, plateIsComplete } from './orders.js';

export const W = 1280;
export const H = 720;

// --- layout: every clickable rectangle, shared with input.js -------------
export const LAYOUT = {
  hud: { x: 0, y: 0, w: 1280, h: 64 },
  orders: { x: 16, y: 72, w: 1248, h: 126 },
  pantry: { x: 16, y: 210, w: 292, h: 386 },
  stations: { x: 324, y: 210, w: 556, h: 386 },
  plate: { x: 896, y: 210, w: 368, h: 386 },
  footer: { x: 0, y: 604, w: 1280, h: 116 },
};

function pantryBinRect(i) {
  const col = i % 2;
  const row = Math.floor(i / 2);
  return { x: LAYOUT.pantry.x + 12 + col * 138, y: LAYOUT.pantry.y + 40 + row * 66, w: 128, h: 58 };
}

function stationRect(id) {
  const idx = STATION_ORDER.indexOf(id);
  const col = idx % 2;
  const row = Math.floor(idx / 2);
  return { x: LAYOUT.stations.x + 12 + col * 272, y: LAYOUT.stations.y + 40 + row * 168, w: 260, h: 156 };
}

export const HIT = {
  pantryBin: pantryBinRect,
  station: stationRect,
  plate: { x: 920, y: 268, w: 320, h: 190 },
  serve: { x: 968, y: 478, w: 224, h: 56 },
  trash: { x: 968, y: 544, w: 224, h: 34 },
  orderTicket(i) {
    return { x: LAYOUT.orders.x + 8 + i * 246, y: LAYOUT.orders.y + 8, w: 234, h: 110 };
  },
};

export function hitRects() {
  return {
    pantry: INGREDIENTS.map((_, i) => pantryBinRect(i)),
    stations: Object.fromEntries(STATION_ORDER.map((id) => [id, stationRect(id)])),
    plate: HIT.plate,
    serve: HIT.serve,
    trash: HIT.trash,
  };
}

// --- small canvas helpers ------------------------------------------------
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h, fill = '#fff8ec', edge = '#d8c49a') {
  rr(ctx, x, y, w, h, 12);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = edge;
  ctx.stroke();
}

function text(ctx, s, x, y, { font = '16px Georgia, serif', color = '#3a2a1a', align = 'left', baseline = 'alphabetic' } = {}) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(s, x, y);
}

function mmss(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// --- food portraits -------------------------------------------------------
export function drawIngredient(ctx, id, cx, cy, r, prepared = false) {
  const ing = INGREDIENT_BY_ID[id];
  if (!ing) return;
  ctx.save();
  ctx.translate(cx, cy);
  if (prepared) {
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 210, 62, 0.35)';
    ctx.fill();
  }
  ctx.fillStyle = ing.color;
  ctx.strokeStyle = ing.dark;
  ctx.lineWidth = 2;
  switch (ing.shape) {
    case 'round': {
      ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3f7d2c';
      ctx.beginPath(); ctx.moveTo(0, -r * 0.85); ctx.lineTo(-r * 0.3, -r * 1.15); ctx.lineTo(r * 0.3, -r * 1.15); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.22, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'leaf': {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4, r * 0.55, r * 0.32, a, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = ing.dark;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'rings': {
      for (let k = 3; k >= 1; k--) {
        ctx.beginPath(); ctx.arc(0, 0, (r * 0.85 * k) / 3, 0, Math.PI * 2);
        ctx.fillStyle = k % 2 ? ing.color : '#fff6e0'; ctx.fill(); ctx.stroke();
      }
      break;
    }
    case 'cap': {
      ctx.beginPath(); ctx.arc(0, -r * 0.15, r * 0.8, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f6ead2';
      rr(ctx, -r * 0.28, -r * 0.2, r * 0.56, r * 0.8, r * 0.2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ing.dark;
      ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.45, r * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.55, r * 0.1, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'drum': {
      ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * 0.8, r * 0.6, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#f6ead2'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(r * 0.55, -r * 0.35); ctx.lineTo(r * 0.95, -r * 0.8); ctx.stroke();
      ctx.fillStyle = '#f6ead2';
      ctx.beginPath(); ctx.arc(r * 0.95, -r * 0.85, r * 0.22, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'steak': {
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.9, r * 0.6, 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#e8b06a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.2); ctx.quadraticCurveTo(0, r * 0.1, r * 0.5, -r * 0.25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 0.45, r * 0.2); ctx.quadraticCurveTo(0, r * 0.45, r * 0.45, r * 0.15); ctx.stroke();
      break;
    }
    case 'curl': {
      ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0.3, Math.PI * 1.7); ctx.lineWidth = r * 0.42; ctx.strokeStyle = ing.color; ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = ing.dark;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0.3, Math.PI * 1.7); ctx.stroke();
      ctx.fillStyle = ing.dark;
      ctx.beginPath(); ctx.arc(r * 0.55, -r * 0.55, r * 0.16, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'fries': {
      ctx.fillStyle = '#f2c14e';
      for (let i = -1; i <= 1; i++) {
        ctx.save(); ctx.translate(i * r * 0.42, -r * 0.1); ctx.rotate(i * 0.12);
        rr(ctx, -r * 0.16, -r * 0.7, r * 0.32, r * 1.3, 3); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      ctx.fillStyle = '#d9392b';
      rr(ctx, -r * 0.85, r * 0.35, r * 1.7, r * 0.4, 4); ctx.fill(); ctx.stroke();
      break;
    }
    case 'loaf': {
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.9, r * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = ing.dark; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.45); ctx.quadraticCurveTo(-r * 0.2, -r * 0.1, -r * 0.5, r * 0.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.quadraticCurveTo(r * 0.3, -r * 0.1, 0, r * 0.25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 0.45); ctx.quadraticCurveTo(r * 0.75, -r * 0.1, r * 0.5, r * 0.2); ctx.stroke();
      break;
    }
    case 'wedge': {
      ctx.beginPath(); ctx.moveTo(-r * 0.8, r * 0.4); ctx.lineTo(r * 0.85, r * 0.4); ctx.lineTo(r * 0.85, -r * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ing.dark;
      ctx.beginPath(); ctx.arc(-r * 0.2, r * 0.1, r * 0.14, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.05, r * 0.11, 0, Math.PI * 2); ctx.fill();
      break;
    }
    default: {
      ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }
  if (!prepared) {
    // Raw items wear a dotted ring: not ready for the plate yet.
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.arc(0, 0, r + 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(58,42,26,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

// --- the kitchen ----------------------------------------------------------
function drawBackground(ctx, t) {
  // Warm bistro wall, tiled floor, wooden pass.
  ctx.fillStyle = '#f3e3c2';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e8d3a8';
  for (let x = 0; x < W; x += 64) {
    ctx.fillRect(x, 64, 2, 140);
    ctx.fillRect(x + 32, 134, 2, 70);
  }
  ctx.fillStyle = '#c98f5f';
  ctx.fillRect(0, 198, W, 10);
  ctx.fillStyle = '#a4713f';
  ctx.fillRect(0, 208, W, 396);
  // Floor boards.
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  for (let y = 240; y < H; y += 48) ctx.fillRect(0, y, W, 2);
  // Hanging lamps with a soft glow.
  for (const lx of [240, 640, 1040]) {
    ctx.strokeStyle = '#5a4632'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, 26); ctx.stroke();
    ctx.fillStyle = 'rgba(255, 214, 120, 0.25)';
    ctx.beginPath(); ctx.arc(lx, 52, 46 + Math.sin(t * 2 + lx) * 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2f5d6e';
    ctx.beginPath(); ctx.moveTo(lx - 26, 34); ctx.lineTo(lx + 26, 34); ctx.lineTo(lx + 14, 52); ctx.lineTo(lx - 14, 52); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd678';
    ctx.beginPath(); ctx.arc(lx, 52, 9, 0, Math.PI * 2); ctx.fill();
  }
  // Framed menu poster on the wall.
  panel(ctx, 1120, 76, 144, 112, '#fff8ec', '#b08d57');
  text(ctx, '★ MENU ★', 1192, 100, { font: 'bold 13px Georgia, serif', color: '#8a5a2b', align: 'center' });
  text(ctx, '8 recipes', 1192, 122, { font: '12px Georgia, serif', color: '#5a4632', align: 'center' });
  text(ctx, '4 stations', 1192, 140, { font: '12px Georgia, serif', color: '#5a4632', align: 'center' });
  text(ctx, 'tips pay!', 1192, 158, { font: 'italic 12px Georgia, serif', color: '#2f5d6e', align: 'center' });
}

function drawHUD(ctx, state, t) {
  const rush = isRush(state);
  ctx.fillStyle = rush ? '#7a1f16' : '#3a2a1a';
  ctx.fillRect(0, 0, W, 64);
  // Title.
  text(ctx, '🍳 THE GOLDEN LADLE', 20, 40, { font: 'bold 26px Georgia, serif', color: '#ffd678' });
  // Day badge.
  panel(ctx, 420, 12, 150, 40, '#fff8ec', '#d8c49a');
  text(ctx, `Day ${state.day} / 3`, 495, 39, { font: 'bold 17px Georgia, serif', color: '#3a2a1a', align: 'center' });
  // Timer — big, and red + pulsing in the rush.
  const pulse = rush ? 1 + Math.sin(t * 6) * 0.08 : 1;
  ctx.save();
  ctx.translate(700, 32);
  ctx.scale(pulse, pulse);
  text(ctx, rush ? '🔥 DINNER RUSH' : '⏱ SHIFT', 0, -12, { font: 'bold 12px Georgia, serif', color: rush ? '#ffb3a0' : '#f3e3c2', align: 'center' });
  text(ctx, mmss(state.timeLeft), 0, 16, { font: 'bold 30px Georgia, serif', color: rush ? '#ff6b4a' : '#ffffff', align: 'center' });
  ctx.restore();
  // Shift progress bar.
  const prog = 1 - state.timeLeft / SHIFT_SECONDS;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  rr(ctx, 590, 56, 220, 5, 2); ctx.fill();
  ctx.fillStyle = rush ? '#ff6b4a' : '#ffd678';
  rr(ctx, 590, 56, 220 * prog, 5, 2); ctx.fill();
  // Coins + combo.
  text(ctx, `🪙 ${state.coins}`, 860, 40, { font: 'bold 24px Georgia, serif', color: '#ffd678' });
  const mult = state.combo > 0 ? `x${(1 + 0.25 * Math.min(state.combo - 1, 8)).toFixed(2)}` : 'x1.00';
  text(ctx, `Combo x${state.combo}  (${mult})`, 1010, 40, { font: 'bold 18px Georgia, serif', color: state.combo >= 3 ? '#7bc043' : '#f3e3c2' });
  text(ctx, `Score ${state.score}`, 1010, 58, { font: '13px Georgia, serif', color: '#cbb89a' });
}

function patienceColor(frac) {
  if (frac > 0.55) return '#7bc043';
  if (frac > 0.28) return '#f2a541';
  return '#d9392b';
}

function drawOrderBoard(ctx, state, t) {
  panel(ctx, LAYOUT.orders.x, LAYOUT.orders.y, LAYOUT.orders.w, LAYOUT.orders.h, '#fff3d6', '#c9a86a');
  if (state.orders.length === 0) {
    text(ctx, 'No orders yet — the first customers are on their way…', 640, 140, { font: 'italic 17px Georgia, serif', color: '#8a7a5f', align: 'center' });
    return;
  }
  state.orders.forEach((order, i) => {
    const r = HIT.orderTicket(i);
    const selected = order.id === state.selectedOrderId;
    const frac = Math.max(0, order.patience / order.patienceMax);
    const urgent = frac < 0.28;
    rr(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fillStyle = selected ? '#fffdf4' : '#fdf6e3';
    ctx.fill();
    ctx.lineWidth = selected ? 3 : 1.5;
    ctx.strokeStyle = urgent ? '#d9392b' : selected ? '#e2572b' : '#d8c49a';
    ctx.stroke();
    // Customer portrait.
    ctx.fillStyle = order.hat;
    ctx.beginPath(); ctx.arc(r.x + 26, r.y + 26, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f6ead2';
    ctx.font = 'bold 12px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(order.customer.slice(0, 2).toUpperCase(), r.x + 26, r.y + 27);
    ctx.fillStyle = order.hat;
    ctx.beginPath(); ctx.arc(r.x + 26, r.y + 10, 12, Math.PI, 0); ctx.fill();
    ctx.fillRect(r.x + 14, r.y + 8, 24, 4);
    text(ctx, order.customer, r.x + 50, r.y + 22, { font: 'bold 14px Georgia, serif', color: '#3a2a1a' });
    text(ctx, order.recipe.name, r.x + 50, r.y + 42, { font: 'bold 15px Georgia, serif', color: '#8a3b2e' });
    // Ingredient dots: filled once plated for this order.
    const missing = missingItems(state, order);
    order.recipe.items.forEach((itemId, k) => {
      const done = !missing.includes(itemId);
      const cx = r.x + 56 + k * 30;
      const cy = r.y + 66;
      drawIngredient(ctx, itemId, cx, cy, 11, done);
      if (!done) {
        ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(58,42,26,0.35)'; ctx.lineWidth = 1; ctx.stroke();
      }
    });
    text(ctx, `+${order.recipe.base} coins`, r.x + 50, r.y + 92, { font: '12px Georgia, serif', color: '#5a4632' });
    // Patience bar.
    ctx.fillStyle = '#e5d5b3';
    rr(ctx, r.x + 130, r.y + 84, 92, 10, 5); ctx.fill();
    ctx.fillStyle = patienceColor(frac);
    if (frac > 0.02) { rr(ctx, r.x + 130, r.y + 84, 92 * frac, 10, 5); ctx.fill(); }
    if (urgent) {
      const blink = 0.6 + Math.sin(t * 8) * 0.4;
      ctx.fillStyle = `rgba(217,57,43,${blink})`;
      ctx.font = 'bold 11px Georgia, serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('HURRY!', r.x + 130, r.y + 78);
    }
  });
}

function drawPantry(ctx, state) {
  panel(ctx, LAYOUT.pantry.x, LAYOUT.pantry.y, LAYOUT.pantry.w, LAYOUT.pantry.h, '#fff8ec', '#d8c49a');
  text(ctx, '🥕 PANTRY — click to pick up', LAYOUT.pantry.x + 14, LAYOUT.pantry.y + 26, { font: 'bold 14px Georgia, serif', color: '#8a5a2b' });
  INGREDIENTS.forEach((ing, i) => {
    const r = pantryBinRect(i);
    const held = state.hand?.kind === 'raw' && state.hand.id === ing.id;
    rr(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.fillStyle = held ? '#ffe9a8' : '#fdf3dd';
    ctx.fill();
    ctx.lineWidth = held ? 3 : 1.5;
    ctx.strokeStyle = held ? '#e2572b' : '#d8c49a';
    ctx.stroke();
    drawIngredient(ctx, ing.id, r.x + 28, r.y + 29, 17, false);
    text(ctx, ing.name, r.x + 52, r.y + 25, { font: 'bold 14px Georgia, serif', color: '#3a2a1a' });
    text(ctx, `→ ${STATIONS[ing.station].verb} (${STATIONS[ing.station].key})`, r.x + 52, r.y + 44, { font: '12px Georgia, serif', color: '#8a7a5f' });
  });
}

function drawStations(ctx, state, t) {
  panel(ctx, LAYOUT.stations.x, LAYOUT.stations.y, LAYOUT.stations.w, LAYOUT.stations.h, '#fff8ec', '#d8c49a');
  text(ctx, '🔥 STATIONS — click a station to cook, click again to collect', LAYOUT.stations.x + 14, LAYOUT.stations.y + 26, { font: 'bold 14px Georgia, serif', color: '#8a5a2b' });
  for (const id of STATION_ORDER) {
    const st = STATIONS[id];
    const r = stationRect(id);
    const job = state.stations[id].busy;
    rr(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fillStyle = job ? '#fff3d6' : '#f7ecd4';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = job?.burnt ? '#d9392b' : st.color;
    ctx.stroke();
    // Station icon strip.
    ctx.fillStyle = st.color;
    rr(ctx, r.x + 10, r.y + 10, r.w - 20, 30, 6); ctx.fill();
    text(ctx, `${st.verb.toUpperCase()}  ·  ${st.name}`, r.x + r.w / 2, r.y + 31, { font: 'bold 14px Georgia, serif', color: '#fff8ec', align: 'center' });
    if (!job) {
      // Idle station drawing.
      if (id === 'chop') {
        ctx.fillStyle = '#d9a05b'; rr(ctx, r.x + 70, r.y + 86, 120, 40, 6); ctx.fill();
        ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(r.x + 90, r.y + 70); ctx.lineTo(r.x + 170, r.y + 100); ctx.stroke();
        ctx.fillStyle = '#c8ccd4'; ctx.beginPath(); ctx.moveTo(r.x + 150, r.y + 62); ctx.lineTo(r.x + 178, r.y + 92); ctx.lineTo(r.x + 168, r.y + 100); ctx.lineTo(r.x + 142, r.y + 72); ctx.closePath(); ctx.fill();
      } else if (id === 'grill') {
        ctx.strokeStyle = '#3a3a42'; ctx.lineWidth = 4;
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(r.x + 70, r.y + 66 + k * 12); ctx.lineTo(r.x + 190, r.y + 66 + k * 12); ctx.stroke(); }
        const fl = 0.7 + Math.sin(t * 5 + r.x) * 0.3;
        ctx.fillStyle = `rgba(226,87,43,${fl})`;
        ctx.beginPath(); ctx.moveTo(r.x + 95, r.y + 130); ctx.quadraticCurveTo(r.x + 110, r.y + 100, r.x + 120, r.y + 130); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(r.x + 135, r.y + 130); ctx.quadraticCurveTo(r.x + 150, r.y + 96, r.x + 165, r.y + 130); ctx.closePath(); ctx.fill();
      } else if (id === 'simmer') {
        ctx.fillStyle = '#7d97a3'; rr(ctx, r.x + 75, r.y + 70, 110, 56, 8); ctx.fill();
        ctx.strokeStyle = '#2f5d6e'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#2f5d6e'; ctx.fillRect(r.x + 65, r.y + 66, 130, 8);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        for (let k = 0; k < 3; k++) {
          const sx = r.x + 105 + k * 25 + Math.sin(t * 2 + k) * 3;
          ctx.beginPath(); ctx.arc(sx, r.y + 56 - Math.sin(t * 3 + k * 2) * 3, 5, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        ctx.fillStyle = '#c98f2d'; rr(ctx, r.x + 70, r.y + 70, 120, 56, 8); ctx.fill();
        ctx.strokeStyle = '#9a6a14'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#f2c14e';
        for (let k = 0; k < 6; k++) {
          const bx = r.x + 88 + k * 16;
          const by = r.y + 84 + Math.sin(t * 4 + k) * 2;
          ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.fill();
        }
      }
      text(ctx, 'empty — send an ingredient', r.x + r.w / 2, r.y + 146, { font: 'italic 12px Georgia, serif', color: '#8a7a5f', align: 'center' });
    } else {
      // Cooking / done / burnt.
      const cx = r.x + 70;
      const cy = r.y + 96;
      drawIngredient(ctx, job.id, cx, cy, 26, job.done);
      if (job.burnt) {
        text(ctx, '🔥 BURNT! Click to clear', r.x + r.w / 2, r.y + 146, { font: 'bold 13px Georgia, serif', color: '#d9392b', align: 'center' });
      } else if (job.done) {
        text(ctx, `${INGREDIENT_BY_ID[job.id].name} is ready!`, r.x + 130, r.y + 82, { font: 'bold 14px Georgia, serif', color: '#2f7d2c' });
        text(ctx, `click to collect — ${Math.max(0, 6 - job.doneFor).toFixed(0)}s before it burns`, r.x + r.w / 2, r.y + 146, { font: '12px Georgia, serif', color: '#8a5a2b', align: 'center' });
        ctx.fillStyle = '#7bc043';
        ctx.beginPath(); ctx.arc(r.x + r.w - 26, r.y + 26, 12, 0, Math.PI * 2); ctx.fill();
        text(ctx, '✓', r.x + r.w - 26, r.y + 30, { font: 'bold 14px Georgia, serif', color: '#fff', align: 'center' });
      } else {
        // Progress ring (right) + a short centred caption (below) so the
        // text can never run into the ring.
        const px = r.x + r.w - 52;
        const py = r.y + 92;
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#e5d5b3';
        ctx.beginPath(); ctx.arc(px, py, 30, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = st.accent;
        ctx.beginPath(); ctx.arc(px, py, 30, -Math.PI / 2, -Math.PI / 2 + job.progress * Math.PI * 2); ctx.stroke();
        text(ctx, `${Math.ceil((1 - job.progress) * job.seconds)}s`, px, py + 5, { font: 'bold 14px Georgia, serif', color: '#3a2a1a', align: 'center' });
        text(ctx, `${st.gerund} ${INGREDIENT_BY_ID[job.id].name}…`, r.x + r.w / 2, r.y + 146, { font: 'bold 13px Georgia, serif', color: '#3a2a1a', align: 'center' });
      }
    }
  }
}

function drawPlate(ctx, state, t) {
  panel(ctx, LAYOUT.plate.x, LAYOUT.plate.y, LAYOUT.plate.w, LAYOUT.plate.h, '#fff8ec', '#d8c49a');
  text(ctx, '🍽 THE PASS — build the dish here', LAYOUT.plate.x + 14, LAYOUT.plate.y + 26, { font: 'bold 14px Georgia, serif', color: '#8a5a2b' });
  const order = state.orders.find((o) => o.id === state.selectedOrderId) ?? state.orders[0];
  const r = HIT.plate;
  // The plate itself.
  const complete = plateIsComplete(state);
  const glow = complete ? 0.5 + Math.sin(t * 5) * 0.3 : 0;
  ctx.save();
  ctx.shadowColor = complete ? '#ffd23e' : 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = complete ? 26 * glow + 8 : 10;
  ctx.fillStyle = '#fdfdf8';
  ctx.beginPath(); ctx.ellipse(r.x + r.w / 2, r.y + r.h / 2 + 10, 140, 78, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.lineWidth = 3;
  ctx.strokeStyle = complete ? '#e8a91c' : '#c9b48a';
  ctx.beginPath(); ctx.ellipse(r.x + r.w / 2, r.y + r.h / 2 + 10, 140, 78, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(r.x + r.w / 2, r.y + r.h / 2 + 10, 108, 58, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#e5d5b3'; ctx.lineWidth = 1.5; ctx.stroke();
  // Plated items, arranged on the plate.
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2 + 10;
  state.plate.items.forEach((itemId, i) => {
    const offs = [[-52, -8], [52, -8], [0, 18], [-26, 26], [26, 26]][i] ?? [0, 0];
    drawIngredient(ctx, itemId, cx + offs[0], cy + offs[1], 26, true);
  });
  if (state.plate.items.length === 0) {
    text(ctx, 'empty plate', cx, cy + 6, { font: 'italic 15px Georgia, serif', color: '#b3a284', align: 'center' });
  }
  // Target recipe line.
  if (order) {
    const missing = missingItems(state, order);
    text(ctx, `Building: ${order.recipe.name} for ${order.customer}`, LAYOUT.plate.x + 184, LAYOUT.plate.y + 232, { font: 'bold 14px Georgia, serif', color: '#3a2a1a', align: 'center' });
    text(ctx, missing.length === 0 ? 'All ingredients on the plate — serve it!' : `Still needs: ${missing.map((m) => INGREDIENT_BY_ID[m].name).join(', ')}`, LAYOUT.plate.x + 184, LAYOUT.plate.y + 254, { font: '13px Georgia, serif', color: missing.length === 0 ? '#2f7d2c' : '#8a7a5f', align: 'center' });
  } else {
    text(ctx, 'No orders — take a breath, chef.', LAYOUT.plate.x + 184, LAYOUT.plate.y + 232, { font: 'italic 14px Georgia, serif', color: '#8a7a5f', align: 'center' });
  }
  // Serve button.
  const s = HIT.serve;
  rr(ctx, s.x, s.y, s.w, s.h, 12);
  ctx.fillStyle = complete ? '#2f7d2c' : '#9a8a72';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = complete ? '#1e5c1a' : '#7a6a52';
  ctx.stroke();
  text(ctx, complete ? '✓ SERVE  (Space)' : 'SERVE  (Space)', s.x + s.w / 2, s.y + 36, { font: 'bold 19px Georgia, serif', color: '#fff8ec', align: 'center' });
  // Trash.
  const tr = HIT.trash;
  text(ctx, '🗑 click plate item to remove · T trashes hand', tr.x + tr.w / 2, tr.y + 22, { font: '12px Georgia, serif', color: '#8a7a5f', align: 'center' });
  // The chef, waiting at the pass (bottom-left corner, face only).
  const chefX = LAYOUT.plate.x + 28;
  const chefY = LAYOUT.plate.y + 350;
  const bob = Math.sin(t * 2) * 2;
  ctx.fillStyle = '#fdfdf8';
  ctx.beginPath(); ctx.arc(chefX, chefY - 26 + bob, 16, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#fdfdf8';
  ctx.beginPath(); ctx.arc(chefX - 10, chefY - 38 + bob, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(chefX, chefY - 42 + bob, 10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(chefX + 10, chefY - 38 + bob, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2f5d6e';
  ctx.fillRect(chefX - 14, chefY - 26 + bob, 28, 4);
  ctx.fillStyle = '#3a2a1a';
  ctx.beginPath(); ctx.arc(chefX - 6, chefY - 24 + bob, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(chefX + 6, chefY - 24 + bob, 2, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(chefX, chefY - 18 + bob, 6, 0.2, Math.PI - 0.2); ctx.stroke();
}

function drawFooter(ctx, state, mouse) {
  const f = LAYOUT.footer;
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(f.x, f.y, f.w, f.h);
  // Hand.
  text(ctx, 'IN HAND:', 24, f.y + 30, { font: 'bold 13px Georgia, serif', color: '#cbb89a' });
  if (state.hand) {
    const ing = INGREDIENT_BY_ID[state.hand.id];
    drawIngredient(ctx, state.hand.id, 130, f.y + 26, 18, state.hand.kind === 'done');
    text(ctx, `${ing.name} (${state.hand.kind === 'raw' ? 'raw' : 'ready'})`, 160, f.y + 31, { font: 'bold 15px Georgia, serif', color: '#fff8ec' });
    const home = state.hand.kind === 'raw' ? `send it to the ${STATIONS[ing.station].name} (${STATIONS[ing.station].key})` : 'click the plate to add it';
    text(ctx, home, 160, f.y + 52, { font: '13px Georgia, serif', color: '#cbb89a' });
  } else {
    text(ctx, 'nothing — click a pantry bin (keys 1–0)', 160, f.y + 31, { font: '15px Georgia, serif', color: '#f3e3c2' });
  }
  // Message line.
  if (state.messageTimer > 0 && state.message) {
    text(ctx, state.message, 640, f.y + 31, { font: 'bold 15px Georgia, serif', color: '#ffd678', align: 'center' });
  }
  // Controls.
  text(ctx, 'Keys: 1–0 pantry · C chop · G grill · S simmer · F fry · Space serve · T trash · P pause · M mute', 640, f.y + 62, { font: '13px Georgia, serif', color: '#cbb89a', align: 'center' });
  text(ctx, `Day ${state.day}: ${dayConfig(state).name} — ${RECIPES.filter((r) => r.day <= state.day).length} recipes · served ${state.served} · lost ${state.lost} · best combo x${state.bestCombo}`, 640, f.y + 88, { font: '13px Georgia, serif', color: '#cbb89a', align: 'center' });
  // Mouse-following hand preview.
  if (mouse && state.hand) {
    drawIngredient(ctx, state.hand.id, mouse.x, mouse.y - 26, 16, state.hand.kind === 'done');
  }
}

function drawOverlay(ctx, state, t) {
  ctx.fillStyle = 'rgba(58,42,26,0.82)';
  ctx.fillRect(0, 0, W, H);
  if (state.phase === 'title') {
    text(ctx, '🍳', 640, 150, { font: '90px Georgia, serif', align: 'center' });
    text(ctx, 'THE GOLDEN LADLE', 640, 230, { font: 'bold 54px Georgia, serif', color: '#ffd678', align: 'center' });
    text(ctx, 'Bistro Rush — a tiny restaurant kitchen', 640, 272, { font: 'italic 22px Georgia, serif', color: '#f3e3c2', align: 'center' });
    text(ctx, 'Three days. Eight recipes. Four stations. One very hungry dining room.', 640, 312, { font: '17px Georgia, serif', color: '#f3e3c2', align: 'center' });
    text(ctx, 'Pick ingredients from the pantry, cook them at the right station,', 640, 344, { font: '17px Georgia, serif', color: '#f3e3c2', align: 'center' });
    text(ctx, 'build each dish on the plate and serve it before patience runs out.', 640, 376, { font: '17px Georgia, serif', color: '#f3e3c2', align: 'center' });
    text(ctx, 'Serve fast for tips. Chain serves for combos. Don’t burn anything.', 640, 408, { font: '17px Georgia, serif', color: '#f3e3c2', align: 'center' });
    const pulse = 0.7 + Math.sin(t * 4) * 0.3;
    ctx.fillStyle = `rgba(255,210,62,${pulse})`;
    rr(ctx, 490, 448, 300, 64, 14); ctx.fill();
    text(ctx, '▶  START DAY 1  (click)', 640, 488, { font: 'bold 22px Georgia, serif', color: '#3a2a1a', align: 'center' });
    text(ctx, 'Mouse + keyboard · 3-minute shifts · the last 30 seconds are the dinner rush', 640, 556, { font: '14px Georgia, serif', color: '#cbb89a', align: 'center' });
  } else if (state.phase === 'dayEnd') {
    const s = state.daySummary;
    text(ctx, `Day ${s.day} complete!`, 640, 180, { font: 'bold 44px Georgia, serif', color: '#ffd678', align: 'center' });
    text(ctx, dayConfig(state).name, 640, 226, { font: 'italic 20px Georgia, serif', color: '#f3e3c2', align: 'center' });
    const rows = [
      ['Orders served', `${s.served}`],
      ['Customers lost', `${s.lost}`],
      ['Tips earned', `${s.tips} coins`],
      ['Best combo', `x${s.bestCombo}`],
      ['Total coins', `${s.coins}`],
    ];
    rows.forEach(([k, v], i) => {
      text(ctx, k, 500, 300 + i * 40, { font: '18px Georgia, serif', color: '#f3e3c2' });
      text(ctx, v, 780, 300 + i * 40, { font: 'bold 18px Georgia, serif', color: '#ffd678', align: 'right' });
    });
    const pulse = 0.7 + Math.sin(t * 4) * 0.3;
    ctx.fillStyle = `rgba(255,210,62,${pulse})`;
    rr(ctx, 490, 520, 300, 60, 14); ctx.fill();
    text(ctx, `▶  START DAY ${state.day + 1}  (click)`, 640, 558, { font: 'bold 20px Georgia, serif', color: '#3a2a1a', align: 'center' });
  } else if (state.phase === 'gameOver') {
    text(ctx, '🏆', 640, 150, { font: '80px Georgia, serif', align: 'center' });
    text(ctx, 'SERVICE COMPLETE!', 640, 220, { font: 'bold 46px Georgia, serif', color: '#ffd678', align: 'center' });
    text(ctx, `You are ${chefTitle(state)}.`, 640, 268, { font: 'italic 24px Georgia, serif', color: '#f3e3c2', align: 'center' });
    const rows = [
      ['Final score', `${state.score}`],
      ['Coins earned', `${state.coins}`],
      ['Orders served', `${state.served}`],
      ['Customers lost', `${state.lost}`],
      ['Dishes burnt', `${state.burnt}`],
      ['Best combo', `x${state.bestCombo}`],
    ];
    rows.forEach(([k, v], i) => {
      text(ctx, k, 500, 330 + i * 38, { font: '18px Georgia, serif', color: '#f3e3c2' });
      text(ctx, v, 780, 330 + i * 38, { font: 'bold 18px Georgia, serif', color: '#ffd678', align: 'right' });
    });
    text(ctx, 'Click to play again', 640, 600, { font: 'bold 18px Georgia, serif', color: '#ffd678', align: 'center' });
  }
  if (state.paused && state.phase === 'playing') {
    text(ctx, '⏸ PAUSED — press P to resume', 640, 360, { font: 'bold 30px Georgia, serif', color: '#ffd678', align: 'center' });
  }
}

// --- main draw -------------------------------------------------------------
export function draw(ctx, state, mouse, t) {
  drawBackground(ctx, t);
  drawHUD(ctx, state, t);
  drawOrderBoard(ctx, state, t);
  drawPantry(ctx, state);
  drawStations(ctx, state, t);
  drawPlate(ctx, state, t);
  drawFooter(ctx, state, mouse);
  if (state.flash > 0) {
    ctx.fillStyle = state.flashColor;
    ctx.globalAlpha = Math.min(0.25, state.flash * 0.6);
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  if (state.phase !== 'playing') drawOverlay(ctx, state, t);
  else if (state.paused) drawOverlay(ctx, state, t);
}
