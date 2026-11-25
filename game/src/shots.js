// shots.js — stages a mid-game state for a screenshot (?shot=cover|chop|serve|rush).
// This is the game's own code rendering its own state: no image is faked, the
// kitchen is simply set to a busy moment a player would reach in a real shift.
import { RECIPES } from './config.js';
import { PHASE } from './world.js';

function placeOrder(world, recipeId, patience, patienceMax) {
  const o = world.orders.addOrder();
  if (recipeId) o.recipe = RECIPES.find((r) => r.id === recipeId) ?? o.recipe;
  o.patience = patience;
  o.patienceMax = patienceMax;
  return o;
}

export function stageShot(world, name) {
  world.reset();
  world.phase = PHASE.PLAYING;
  world.audio.stopMusic();
  const k = world.kitchen;
  const p = world.player;

  if (name === 'cover') {
    // The fullest kitchen: three orders, a patty on the grill, soup on the
    // stove, a burger mid-assembly and a salad plate ready to serve.
    world.score = 86;
    world.served = 5;
    world.combo = 3;
    world.timeLeft = 134;
    world.elapsed = 46;
    placeOrder(world, 'burger', 41, 58);
    placeOrder(world, 'salad', 24, 52);
    placeOrder(world, 'soup', 48, 60);
    k.grill[0] = { item: 'patty', progress: 3.4, done: false, burnt: false, announced: false };
    k.stove[0] = { item: 'pot', progress: 5.2, done: false, burnt: false, announced: false };
    k.plate = ['bun', 'pattyCooked'];
    p.carrying = 'lettuceChopped';
    p.x = 640; p.y = 575; p.facing = -Math.PI / 2;
    world.say('Burger needs chopped lettuce — plate it, then serve!', 3);
  } else if (name === 'chop') {
    world.score = 24;
    world.served = 1;
    world.timeLeft = 152;
    world.elapsed = 28;
    placeOrder(world, 'salad', 44, 58);
    placeOrder(world, 'burger', 50, 58);
    p.carrying = 'tomato';
    k.chopItem = 'tomato';
    k.chopProgress = 0.6;
    p.x = 131; p.y = 440; p.facing = Math.PI / 2;
    world.say('Hold E to chop the tomato for the salad…', 3);
  } else if (name === 'serve') {
    world.score = 112;
    world.served = 7;
    world.combo = 4;
    world.timeLeft = 96;
    world.elapsed = 84;
    placeOrder(world, 'burger', 18, 55);
    placeOrder(world, 'melt', 38, 55);
    k.plate = ['bun', 'pattyCooked', 'lettuceChopped'];
    p.carrying = 'plate';
    p.x = 1076; p.y = 430; p.facing = -Math.PI / 2;
    world.say('Sunny Burger ready — press E at the window to serve!', 3);
  } else if (name === 'rush') {
    world.score = 148;
    world.served = 9;
    world.combo = 5;
    world.timeLeft = 24;
    world.elapsed = 156;
    world.rush = true;
    world.orders.rush = true;
    placeOrder(world, 'burger', 9, 40);
    placeOrder(world, 'salad', 14, 40);
    placeOrder(world, 'soup', 22, 40);
    placeOrder(world, 'melt', 31, 40);
    k.grill[0] = { item: 'patty', progress: 4.6, done: false, burnt: false, announced: false };
    k.grill[1] = { item: 'patty', progress: 5.4, done: true, burnt: false, announced: true };
    k.plate = ['lettuceChopped', 'tomatoChopped'];
    p.carrying = 'cheese';
    p.x = 640; p.y = 575; p.facing = -Math.PI / 2;
    world.say('DINNER RUSH! Four orders, twenty-four seconds — keep moving!', 3);
  }
  // Freeze the clock for the shot: the staged moment stays readable.
  world._frozen = true;
}
