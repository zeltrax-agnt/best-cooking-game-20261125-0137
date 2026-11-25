// orders.js — the order board: what customers want, how long they will wait,
// and what a served dish is worth. Pressure grows: more orders, less patience.
import { RECIPES, orderPatience, spawnInterval } from './config.js';

let nextOrderId = 1;

export class Orders {
  constructor() {
    this.list = [];
    this.spawnTimer = 6; // first order arrives a few seconds in
    this.elapsed = 0;
    this.rush = false;
  }

  reset() {
    this.list = [];
    this.spawnTimer = 6;
    this.elapsed = 0;
    this.rush = false;
  }

  update(dt, onExpire) {
    this.elapsed += dt;
    this.spawnTimer -= dt;
    const maxOrders = this.rush ? 4 : 3;
    if (this.spawnTimer <= 0 && this.list.length < maxOrders) {
      this.addOrder();
      this.spawnTimer = spawnInterval(this.elapsed, this.rush);
    }
    for (const o of this.list) o.patience -= dt;
    const expired = this.list.filter((o) => o.patience <= 0);
    if (expired.length) {
      this.list = this.list.filter((o) => o.patience > 0);
      for (const o of expired) onExpire(o);
    }
  }

  addOrder(recipe = null) {
    const pick = recipe ?? RECIPES[Math.floor(Math.random() * RECIPES.length)];
    const patience = orderPatience(this.elapsed);
    this.list.push({
      id: nextOrderId++,
      recipe: pick,
      patience,
      patienceMax: patience,
      born: this.elapsed,
    });
    return this.list[this.list.length - 1];
  }

  // The order a plate (or a lone soup) can satisfy, oldest first.
  matchFor(items) {
    const sorted = [...items].sort();
    for (const o of this.list) {
      const need = [...o.recipe.needs].sort();
      if (need.length === sorted.length && need.every((n, i) => n === sorted[i])) return o;
    }
    return null;
  }

  remove(order) {
    this.list = this.list.filter((o) => o.id !== order.id);
  }

  // How much of a dish's price the customer still pays for a slow serve.
  tipFor(order) {
    const frac = Math.max(0, order.patience / order.patienceMax);
    return Math.round(order.recipe.price * 0.6 * frac);
  }
}
