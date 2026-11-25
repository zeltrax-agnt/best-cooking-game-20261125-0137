// input.js — keyboard and mouse, one job: tell the game what the player is doing.
// Keys move the chef, E interacts, 1-6 grab ingredients, P pauses, M mutes, R restarts.
// Clicking sets a walk target; clicking a station in range interacts with it.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set(); // keys pressed since last poll (edge-triggered)
    this.mouse = { x: 0, y: 0, clicked: false, down: false };
    this.walkTarget = null;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.key.toLowerCase());
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.walkTarget = null; });

    canvas.addEventListener('pointerdown', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
      this.mouse.down = true;
      this.mouse.clicked = true;
      this.walkTarget = { x: this.mouse.x, y: this.mouse.y };
    });
    window.addEventListener('pointerup', () => { this.mouse.down = false; });
  }

  // Movement vector from WASD / arrows, normalised.
  moveVector() {
    let x = 0, y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    return { x, y };
  }

  hasKeys() {
    return ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']
      .some((k) => this.keys.has(k));
  }

  // True once per physical press; the game loop consumes it each frame.
  wasPressed(key) {
    const hit = this.pressed.has(key.toLowerCase());
    if (hit) this.pressed.delete(key.toLowerCase());
    return hit;
  }

  consumeClick() {
    const c = this.mouse.clicked;
    this.mouse.clicked = false;
    return c;
  }

  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
