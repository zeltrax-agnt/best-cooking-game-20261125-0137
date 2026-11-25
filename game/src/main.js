// main.js — boots Sizzle & Serve: canvas setup, the game loop, the ?shot= hook.
// The loop runs at the display's refresh rate; the world updates in seconds.
import { VIEW_W, VIEW_H } from './config.js';
import { World } from './world.js';
import { Input } from './input.js';
import { render } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = VIEW_W * dpr;
  canvas.height = VIEW_H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

const world = new World();
const input = new Input(canvas);
const status = document.getElementById('status');
// Test hook only: lets a play-test read the live state. It changes nothing.
window.__sizzle = world;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  stageShot(world, shot);
  // A staged shot never ticks: the moment stays exactly as staged.
  world.update = ((orig) => (dt, inp) => {
    if (world._frozen) { input.endFrame(); return; }
    return orig.call(world, dt, inp);
  })(world.update.bind(world));
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  world.update(dt, input);
  render(ctx, world);
  const line = world.phase === 'playing'
    ? `Score $${world.score}, ${world.served} served, ${Math.ceil(world.timeLeft)} seconds left in the shift.`
    : world.phase === 'title' ? 'Sizzle and Serve: press Enter to start cooking.' : 'Shift over.';
  if (status.textContent !== line) status.textContent = line;
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
