// player.js — the chef: where they stand, what they carry, how they walk.
// The chef carries exactly one thing at a time, so every trip is a decision:
// which ingredient, which station, which order is it for?
import { CHEF_SPEED, CHEF_RADIUS, VIEW_W, VIEW_H } from './config.js';

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 640;
    this.y = 600;
    this.facing = -Math.PI / 2;
    this.carrying = null; // an item id, or 'plate' handled by the world
    this.moving = false;
    this.walkBob = 0;
  }

  // Solid counters the chef cannot walk through: {x, y, w, h} rects.
  update(dt, input, solids) {
    const mv = input.moveVector();
    let vx = mv.x, vy = mv.y;
    if (vx === 0 && vy === 0 && input.walkTarget) {
      const dx = input.walkTarget.x - this.x;
      const dy = input.walkTarget.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d > 8) { vx = dx / d; vy = dy / d; } else { input.walkTarget = null; }
    }
    if (input.hasKeys()) input.walkTarget = null;
    this.moving = vx !== 0 || vy !== 0;
    if (this.moving) {
      this.facing = Math.atan2(vy, vx);
      this.walkBob += dt * 11;
      this.moveAxis(dt, vx, 0, solids);
      this.moveAxis(dt, 0, vy, solids);
    }
  }

  moveAxis(dt, dx, dy, solids) {
    const nx = this.x + dx * CHEF_SPEED * dt;
    const ny = this.y + dy * CHEF_SPEED * dt;
    const r = CHEF_RADIUS;
    if (nx < 30 + r || nx > VIEW_W - 30 - r || ny < 158 + r || ny > VIEW_H - 16 - r) return;
    for (const s of solids) {
      if (nx + r > s.x && nx - r < s.x + s.w && ny + r > s.y && ny - r < s.y + s.h) return;
    }
    this.x = nx;
    this.y = ny;
  }

  distTo(x, y) { return Math.hypot(this.x - x, this.y - y); }
}
