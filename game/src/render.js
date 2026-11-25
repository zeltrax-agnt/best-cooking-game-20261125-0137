// render.js — everything the player sees, drawn in canvas code: the kitchen,
// the food, the order board, the timers. No images, no fonts from the network.
import { VIEW_W, VIEW_H, RUSH_AT, PALETTE, INGREDIENTS, FINISHED_NAMES, RECIPES } from './config.js';
import { PHASE } from './world.js';
import { STATIONS } from './stations.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, colour, weight = '700', align = 'left') {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px Trebuchet MS, Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

// --- Food, drawn so it looks worth serving ---------------------------------
export function drawIngredient(ctx, id, x, y, s) {
  const u = s / 40; // unit scale
  ctx.save();
  ctx.translate(x, y);
  switch (id) {
    case 'bun': {
      ctx.fillStyle = '#e8b96a'; rr(ctx, -18 * u, -12 * u, 36 * u, 22 * u, 10 * u); ctx.fill();
      ctx.fillStyle = '#c98f3e'; rr(ctx, -18 * u, 2 * u, 36 * u, 8 * u, 4 * u); ctx.fill();
      ctx.fillStyle = '#fff2cf';
      [[-10, -6], [0, -8], [10, -6]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(dx * u, dy * u, 1.6 * u, 0, 7); ctx.fill(); });
      break;
    }
    case 'patty':
    case 'pattyCooked': {
      ctx.fillStyle = id === 'pattyCooked' ? '#6b4226' : '#8a5a3b';
      rr(ctx, -19 * u, -9 * u, 38 * u, 18 * u, 9 * u); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      [[-11, -3], [-2, 3], [9, -2]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(dx * u, dy * u, 2.2 * u, 0, 7); ctx.fill(); });
      if (id === 'pattyCooked') { ctx.strokeStyle = '#ffcf5e'; ctx.lineWidth = 1.5 * u; ctx.beginPath(); ctx.moveTo(-14 * u, -11 * u); ctx.lineTo(14 * u, -11 * u); ctx.stroke(); }
      break;
    }
    case 'lettuce':
    case 'lettuceChopped': {
      ctx.fillStyle = '#7dc24a';
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const px = Math.cos(a) * 17 * u, py = Math.sin(a) * 11 * u;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#4c8a26'; ctx.lineWidth = 1.6 * u;
      ctx.beginPath(); ctx.moveTo(-14 * u, 0); ctx.lineTo(14 * u, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -8 * u); ctx.lineTo(0, 8 * u); ctx.stroke();
      break;
    }
    case 'tomato':
    case 'tomatoChopped': {
      ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.arc(0, 0, 15 * u, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff8a80'; ctx.beginPath(); ctx.arc(-5 * u, -5 * u, 5 * u, 0, 7); ctx.fill();
      ctx.fillStyle = '#4c8a26';
      ctx.beginPath(); ctx.moveTo(0, -15 * u); ctx.lineTo(-6 * u, -21 * u); ctx.lineTo(6 * u, -21 * u); ctx.closePath(); ctx.fill();
      if (id === 'tomatoChopped') {
        ctx.strokeStyle = '#a92c30'; ctx.lineWidth = 2 * u;
        ctx.beginPath(); ctx.moveTo(-12 * u, -8 * u); ctx.lineTo(12 * u, 8 * u); ctx.stroke();
      }
      break;
    }
    case 'cheese': {
      ctx.fillStyle = '#ffc93c';
      ctx.beginPath(); ctx.moveTo(-18 * u, 10 * u); ctx.lineTo(18 * u, 10 * u); ctx.lineTo(0, -13 * u); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d99a00';
      [[-6, 4], [5, 5]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(dx * u, dy * u, 2 * u, 0, 7); ctx.fill(); });
      break;
    }
    case 'pot': {
      ctx.fillStyle = '#8d99a6'; rr(ctx, -17 * u, -8 * u, 34 * u, 20 * u, 5 * u); ctx.fill();
      ctx.fillStyle = '#5d6b7a'; rr(ctx, -19 * u, -12 * u, 38 * u, 6 * u, 3 * u); ctx.fill();
      ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.arc(0, -4 * u, 9 * u, 0, 7); ctx.fill();
      break;
    }
    case 'soup': {
      ctx.fillStyle = '#f4ead2'; ctx.beginPath(); ctx.arc(0, 2 * u, 17 * u, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.arc(0, 0, 14 * u, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2 * u;
      ctx.beginPath(); ctx.moveTo(-6 * u, -8 * u); ctx.quadraticCurveTo(-10 * u, -16 * u, -5 * u, -20 * u); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5 * u, -8 * u); ctx.quadraticCurveTo(9 * u, -16 * u, 4 * u, -20 * u); ctx.stroke();
      break;
    }
    default: break;
  }
  ctx.restore();
}

function drawPlate(ctx, items, x, y, s) {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(x, y + 14, s * 0.62, s * 0.22, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#c9c2ae'; ctx.lineWidth = 2; ctx.stroke();
  items.forEach((item, i) => drawIngredient(ctx, item, x, y - i * 9, s * 0.8));
}

// --- The kitchen ------------------------------------------------------------
function drawFloor(ctx) {
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, 150, VIEW_W, VIEW_H - 150);
  ctx.fillStyle = PALETTE.floorDark;
  for (let y = 150; y < VIEW_H; y += 64) {
    for (let x = ((y / 64) % 2) * 64; x < VIEW_W; x += 128) ctx.fillRect(x, y, 64, 64);
  }
  ctx.strokeStyle = PALETTE.floorLine;
  ctx.lineWidth = 2;
  for (let y = 150; y <= VIEW_H; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW_W, y); ctx.stroke(); }
  for (let x = 0; x <= VIEW_W; x += 64) { ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x, VIEW_H); ctx.stroke(); }
  // Top wall.
  ctx.fillStyle = PALETTE.wallTop; ctx.fillRect(0, 148, VIEW_W, 8);
}

function drawStation(ctx, world, s) {
  const k = world.kitchen;
  ctx.save();
  // Counter body.
  ctx.fillStyle = PALETTE.counterEdge; rr(ctx, s.x - 3, s.y - 3, s.w + 6, s.h + 6, 12); ctx.fill();
  let body = PALETTE.counter;
  if (s.id === 'grill') body = PALETTE.grill;
  if (s.id === 'stove') body = PALETTE.stove;
  if (s.id === 'fridge') body = PALETTE.fridge;
  if (s.id === 'window') body = '#3d8a74';
  ctx.fillStyle = body; rr(ctx, s.x, s.y, s.w, s.h, 10); ctx.fill();

  // Station label.
  text(ctx, s.name.toUpperCase(), s.x + s.w / 2, s.y + 16, 13, s.id === 'grill' || s.id === 'stove' ? '#f4ead2' : '#6b5a3e', '800', 'center');

  if (s.id === 'fridge' || s.id === 'produce') {
    const ids = s.id === 'fridge' ? ['bun', 'patty', 'cheese', 'pot'] : ['lettuce', 'tomato'];
    const slotW = s.w / ids.length;
    ids.forEach((id, i) => {
      const cx = s.x + slotW * (i + 0.5);
      ctx.fillStyle = 'rgba(0,0,0,0.08)'; rr(ctx, cx - slotW / 2 + 4, s.y + 30, slotW - 8, 52, 8); ctx.fill();
      drawIngredient(ctx, id, cx, s.y + 52, 30);
      text(ctx, INGREDIENTS[id].key, cx - slotW / 2 + 10, s.y + 34, 11, '#6b5a3e', '800');
      text(ctx, id === 'pot' ? 'Pot' : INGREDIENTS[id].name, cx, s.y + 88, 10, '#6b5a3e', '700', 'center');
    });
  }

  if (s.id === 'board') {
    ctx.fillStyle = '#c9a86a'; rr(ctx, s.x + 14, s.y + 34, s.w - 28, 46, 8); ctx.fill();
    ctx.fillStyle = '#e8d5a8'; rr(ctx, s.x + 18, s.y + 37, s.w - 36, 40, 6); ctx.fill();
    if (k.chopItem) drawIngredient(ctx, k.chopItem, s.x + s.w / 2, s.y + 57, 30);
    if (k.chopProgress > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; rr(ctx, s.x + 20, s.y + 82, s.w - 40, 8, 4); ctx.fill();
      ctx.fillStyle = '#4c9a3f'; rr(ctx, s.x + 20, s.y + 82, (s.w - 40) * k.chopProgress, 8, 4); ctx.fill();
    }
    // Knife.
    ctx.save();
    ctx.translate(s.x + s.w - 34, s.y + 52); ctx.rotate(-0.5);
    ctx.fillStyle = '#d7dee5'; rr(ctx, 0, -3, 26, 6, 3); ctx.fill();
    ctx.fillStyle = '#5d3a24'; rr(ctx, -12, -3, 12, 6, 3); ctx.fill();
    ctx.restore();
  }

  if (s.id === 'grill') {
    k.grill.forEach((slot, i) => {
      const cx = s.x + 42 + i * 86;
      ctx.fillStyle = '#22262c'; rr(ctx, cx - 34, s.y + 34, 68, 44, 8); ctx.fill();
      if (slot.item) {
        drawIngredient(ctx, slot.done ? 'pattyCooked' : 'patty', cx, s.y + 52, 30);
        const frac = Math.min(1, slot.progress / 5);
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; rr(ctx, cx - 30, s.y + 80, 60, 7, 3); ctx.fill();
        ctx.fillStyle = slot.burnt ? '#1c1c1c' : slot.done ? '#4c9a3f' : '#ff9d2e';
        rr(ctx, cx - 30, s.y + 80, 60 * frac, 7, 3); ctx.fill();
        if (slot.burnt) text(ctx, 'BURNT!', cx, s.y + 44, 11, '#ff6b5e', '800', 'center');
        else if (slot.done) text(ctx, 'READY', cx, s.y + 44, 11, '#7de07a', '800', 'center');
      }
    });
  }

  if (s.id === 'stove') {
    const slot = k.stove[0];
    ctx.fillStyle = '#22262c'; ctx.beginPath(); ctx.arc(s.x + s.w / 2, s.y + 56, 30, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ff9d2e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(s.x + s.w / 2, s.y + 56, 22, 0, 7); ctx.stroke();
    if (slot.item) {
      drawIngredient(ctx, slot.done ? 'soup' : 'pot', s.x + s.w / 2, s.y + 56, 34);
      const frac = Math.min(1, slot.progress / 6);
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; rr(ctx, s.x + 22, s.y + 82, s.w - 44, 7, 3); ctx.fill();
      ctx.fillStyle = slot.done ? '#4c9a3f' : '#ff9d2e';
      rr(ctx, s.x + 22, s.y + 82, (s.w - 44) * frac, 7, 3); ctx.fill();
      if (slot.done) text(ctx, 'READY', s.x + s.w / 2, s.y + 40, 11, '#7de07a', '800', 'center');
    }
  }

  if (s.id === 'island') {
    if (world.player.carrying === 'plate') {
      ctx.strokeStyle = 'rgba(107,90,62,0.5)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(s.x + s.w / 2, s.y + 62, 70, 22, 0, 0, 7); ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, 'Plate is with the chef →', s.x + s.w / 2, s.y + 62, 13, '#8a7a5e', '700', 'center');
    } else if (k.plate.length) {
      drawPlate(ctx, k.plate, s.x + s.w / 2, s.y + 62, 34);
      const match = world.orders.matchFor(k.plate);
      text(ctx, match ? 'READY TO SERVE!' : 'PLATING…', s.x + s.w / 2, s.y + 30, 13, match ? '#2f7a2a' : '#6b5a3e', '800', 'center');
    } else {
      ctx.strokeStyle = 'rgba(107,90,62,0.5)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(s.x + s.w / 2, s.y + 62, 70, 22, 0, 0, 7); ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, 'Build a dish here', s.x + s.w / 2, s.y + 62, 13, '#8a7a5e', '700', 'center');
    }
  }

  if (s.id === 'window') {
    ctx.fillStyle = '#2f6f5e'; rr(ctx, s.x + 14, s.y + 30, s.w - 28, 44, 8); ctx.fill();
    ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.arc(s.x + s.w - 34, s.y + 52, 12, 0, 7); ctx.fill();
    ctx.fillStyle = '#8a6d1f'; ctx.fillRect(s.x + s.w - 36, s.y + 52, 4, 8);
    text(ctx, 'SERVE  •  ring the bell', s.x + s.w / 2, s.y + 52, 13, '#fff8e7', '800', 'center');
  }

  if (s.id === 'bin') {
    ctx.fillStyle = '#6b7280'; rr(ctx, s.x + 28, s.y + 30, s.w - 56, 44, 8); ctx.fill();
    ctx.fillStyle = '#4b5563'; rr(ctx, s.x + 22, s.y + 24, s.w - 44, 10, 5); ctx.fill();
  }

  // Highlight the station the chef can use right now.
  const near = world.currentStation();
  if (near && near.id === s.id && world.phase === PHASE.PLAYING) {
    ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 3;
    rr(ctx, s.x - 6, s.y - 6, s.w + 12, s.h + 12, 14); ctx.stroke();
  }
  ctx.restore();
}

// --- Order board -------------------------------------------------------------
function drawOrderBoard(ctx, world) {
  ctx.fillStyle = '#3a2c1e'; rr(ctx, 24, 60, VIEW_W - 48, 88, 12); ctx.fill();
  text(ctx, 'ORDER BOARD', 44, 76, 13, '#ffd98a', '800');
  text(ctx, 'serve before the bar runs out', 150, 76, 12, '#d8c9a8', '600');
  if (!world.orders.list.length) {
    text(ctx, 'No orders yet — the first customer is on their way…', 44, 116, 15, '#e9e2d0', '600');
    return;
  }
  world.orders.list.forEach((o, i) => {
    const x = 44 + i * 302;
    const w = 288;
    const frac = Math.max(0, o.patience / o.patienceMax);
    const urgent = frac < 0.35;
    ctx.fillStyle = urgent ? '#5e2b25' : PALETTE.paper;
    rr(ctx, x, 88, w, 52, 9); ctx.fill();
    ctx.strokeStyle = urgent ? '#ff6b5e' : '#c9b98f'; ctx.lineWidth = 2;
    rr(ctx, x, 88, w, 52, 9); ctx.stroke();
    text(ctx, `#${o.id}  ${o.recipe.name}`, x + 12, 104, 14, urgent ? '#ffd9d0' : PALETTE.ink, '800');
    text(ctx, `$${o.recipe.price}`, x + w - 12, 104, 14, '#2f7a2a', '800', 'right');
    // Recipe icons.
    o.recipe.needs.forEach((need, j) => drawIngredient(ctx, need, x + 24 + j * 34, 124, 26));
    // Patience bar.
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; rr(ctx, x + 12, 132, w - 24, 6, 3); ctx.fill();
    ctx.fillStyle = frac > 0.5 ? '#4c9a3f' : frac > 0.25 ? '#ff9d2e' : '#e5484d';
    rr(ctx, x + 12, 132, (w - 24) * frac, 6, 3); ctx.fill();
    text(ctx, `${Math.ceil(o.patience)}s`, x + w - 12, 124, 11, urgent ? '#ff8a7a' : '#8a7a5e', '800', 'right');
  });
}

// --- Chef --------------------------------------------------------------------
function drawChef(ctx, world) {
  const p = world.player;
  const bob = p.moving ? Math.sin(p.walkBob) * 2 : 0;
  ctx.save();
  ctx.translate(p.x, p.y + bob * 0.4);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 20, 20, 7, 0, 0, 7); ctx.fill();
  // Body (apron).
  ctx.fillStyle = '#f7f3ea'; ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill();
  ctx.fillStyle = '#3d8a74'; rr(ctx, -13, -4, 26, 20, 8); ctx.fill();
  // Face.
  ctx.fillStyle = '#f2c89b'; ctx.beginPath(); ctx.arc(0, -2, 11, 0, 7); ctx.fill();
  ctx.fillStyle = '#2b2118';
  const lookX = Math.cos(p.facing) * 3, lookY = Math.sin(p.facing) * 3;
  ctx.beginPath(); ctx.arc(-4 + lookX, -4 + lookY, 1.8, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(4 + lookX, -4 + lookY, 1.8, 0, 7); ctx.fill();
  // Chef hat.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-7, -14, 7, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -17, 8, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(7, -14, 7, 0, 7); ctx.fill();
  ctx.fillRect(-11, -14, 22, 7);
  // Carried item floats above the hat.
  if (p.carrying) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.arc(0, -38, 19, 0, 7); ctx.fill();
    if (p.carrying === 'plate') drawPlate(ctx, world.kitchen.plate, 0, -46, 30);
    else drawIngredient(ctx, p.carrying, 0, -38, 30);
  }
  ctx.restore();
}

// --- HUD, prompts, overlays --------------------------------------------------
function drawHUD(ctx, world) {
  ctx.fillStyle = '#2b2118'; ctx.fillRect(0, 0, VIEW_W, 56);
  text(ctx, '🍳 SIZZLE & SERVE', 24, 28, 22, '#ffd98a', '800');
  text(ctx, 'a tiny restaurant kitchen', 268, 30, 13, '#d8c9a8', '600');
  const mins = Math.floor(world.timeLeft / 60);
  const secs = Math.floor(world.timeLeft % 60);
  const timerColour = world.timeLeft <= RUSH_AT ? '#ff6b5e' : '#ffffff';
  text(ctx, `⏱ ${mins}:${String(secs).padStart(2, '0')}`, VIEW_W - 420, 28, 22, timerColour, '800', 'right');
  text(ctx, `$${world.score}`, VIEW_W - 300, 28, 22, '#7de07a', '800', 'right');
  text(ctx, world.combo > 1 ? `COMBO x${world.combo}` : 'served ' + world.served, VIEW_W - 180, 28, 16, world.combo > 1 ? '#ffd23e' : '#d8c9a8', '800', 'right');
  if (world.rush && world.phase === PHASE.PLAYING) {
    const pulse = 0.6 + 0.4 * Math.sin(world.elapsed * 6);
    ctx.fillStyle = `rgba(229,72,77,${0.25 + pulse * 0.2})`;
    rr(ctx, VIEW_W / 2 - 130, 8, 260, 40, 10); ctx.fill();
    text(ctx, '★ DINNER RUSH ★', VIEW_W / 2, 28, 17, '#ffffff', '800', 'center');
  }
}

function drawPrompt(ctx, world) {
  if (world.phase !== PHASE.PLAYING) return;
  const s = world.currentStation();
  if (!s) return;
  const hint = s.id === 'board' && world.player.carrying && world.kitchen.chopItem
    ? 'Chopping… keep holding E!'
    : s.hint;
  const label = `E — ${s.name}: ${hint}`;
  ctx.font = '700 14px Trebuchet MS, Verdana, sans-serif';
  const w = ctx.measureText(label).width + 28;
  const x = Math.max(12, Math.min(VIEW_W - w - 12, world.player.x - w / 2));
  const y = world.player.y - 78;
  ctx.fillStyle = 'rgba(43,33,24,0.92)'; rr(ctx, x, y, w, 30, 9); ctx.fill();
  text(ctx, label, x + 14, y + 15, 14, '#ffe9b0', '700');
}

function drawToast(ctx, world) {
  if (world.toastTimer <= 0 || !world.toast) return;
  ctx.font = '700 16px Trebuchet MS, Verdana, sans-serif';
  const w = ctx.measureText(world.toast).width + 32;
  ctx.fillStyle = 'rgba(43,33,24,0.92)'; rr(ctx, (VIEW_W - w) / 2, VIEW_H - 46, w, 32, 10); ctx.fill();
  text(ctx, world.toast, VIEW_W / 2, VIEW_H - 30, 16, '#ffe9b0', '700', 'center');
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(20,14,8,0.72)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = PALETTE.paper; rr(ctx, VIEW_W / 2 - 340, 150, 680, 420, 18); ctx.fill();
  ctx.strokeStyle = accent; ctx.lineWidth = 4; rr(ctx, VIEW_W / 2 - 340, 150, 680, 420, 18); ctx.stroke();
  text(ctx, title, VIEW_W / 2, 210, 40, PALETTE.ink, '800', 'center');
  lines.forEach((l, i) => text(ctx, l, VIEW_W / 2, 268 + i * 34, 17, '#5a4a38', '600', 'center'));
}

export function render(ctx, world) {
  ctx.save();
  if (world.shake > 0) {
    ctx.translate((Math.random() - 0.5) * 8 * world.shake, (Math.random() - 0.5) * 8 * world.shake);
  }
  drawFloor(ctx);
  for (const s of STATIONS) drawStation(ctx, world, s);
  drawChef(ctx, world);
  drawOrderBoard(ctx, world);
  drawHUD(ctx, world);
  drawPrompt(ctx, world);
  drawToast(ctx, world);
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(229,72,77,${world.flash * 0.35})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  ctx.restore();

  if (world.phase === PHASE.TITLE) {
    overlay(ctx, '🍳 SIZZLE & SERVE', [
      'You run a tiny restaurant kitchen — alone, on a busy night.',
      'WASD / arrows to move · E to use a station · 1-6 or click to grab',
      'Chop lettuce & tomato · grill patties · simmer soup · plate it up',
      'Serve each order before its patience bar runs out. Combos pay extra!',
      '',
      'Press ENTER or click to open the kitchen',
    ], '#ff9d2e');
  } else if (world.phase === PHASE.PAUSED) {
    overlay(ctx, 'Paused', ['Take a breath — the customers can wait a moment.', 'Press P to get back to the pass.'], '#3d8a74');
  } else if (world.phase === PHASE.OVER) {
    overlay(ctx, 'Shift Over!', [
      `You served ${world.served} dish${world.served === 1 ? '' : 'es'} and earned $${world.score}.`,
      `Best combo x${world.bestCombo} · ${world.expiredCount} order${world.expiredCount === 1 ? '' : 's'} walked out.`,
      world.score >= 150 ? 'A night to remember — the regulars are already back!' : 'A solid shift — tomorrow the kitchen runs smoother.',
      '',
      'Press R or ENTER to cook another shift',
    ], '#4c9a3f');
  }
}

export { RECIPES, FINISHED_NAMES };
