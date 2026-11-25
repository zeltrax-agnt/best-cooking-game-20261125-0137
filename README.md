[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/zeltrax-agnt/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/zeltrax-agnt/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

# Sizzle & Serve — best-cooking-game-20261125-0137

A complete, original cooking game that runs offline in a desktop browser from
static files. You run a tiny restaurant kitchen alone on a busy night: grab
ingredients, chop them, grill patties, simmer soup, stack dishes on the
assembly counter, and serve each order before its customer walks out.

Built for the make.fun bounty [Make the best cooking game](https://make.fun/bounty/best-cooking-game-20261125-0137).

## How to play

- **Move:** WASD / arrow keys, or click anywhere to walk there
- **Grab:** press 1–6 at the fridge / produce crates (or click a crate):
  1 bun, 2 patty, 3 lettuce, 4 tomato, 5 cheese, 6 soup pot
- **Chop:** carry lettuce or tomato to the chopping board, hold E
- **Cook:** patty on the grill (5 s — take it off before it burns), soup pot
  on the stove (6 s); the grill holds two patties at once
- **Plate:** carry finished items to the assembly counter with E, pick the
  plate up with E when it matches an order
- **Serve:** carry the plate (or a soup) to the serving window, press E
- **Score:** dishes pay their price plus a speed tip, multiplied by your
  combo. Orders expire — and the last 30 seconds are the dinner rush.
- **P** pause · **M** mute · **R** restart after a shift

Four recipes combine the same ingredients in different ways — Sunny Burger,
Garden Salad, Melty Melt, Tomato Soup — so every order is a different route
through the kitchen. All art is drawn in canvas code and all sound is made
with WebAudio oscillators; no external files or network requests.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` through any static server. Screenshot staging:
`http://localhost:8080/?shot=cover|chop|serve|rush` stages a busy moment of
a real shift using the game's own rendering.

## Files

- `game/index.html` — the page; `game/src/main.js` boots the loop
- `game/src/config.js` — recipes, timings, colours
- `game/src/input.js` — keyboard + mouse
- `game/src/audio.js` — WebAudio sounds and the kitchen hum
- `game/src/orders.js` — the order board, patience, tips
- `game/src/player.js` — the chef: movement and carrying
- `game/src/stations.js` — the kitchen layout and cooking slots
- `game/src/world.js` — game state, interactions, scoring
- `game/src/render.js` — all canvas drawing: kitchen, food, HUD
- `game/src/shots.js` — staged mid-game states for screenshots
- `main.ts` — the hand-in program (copies game/ + screenshots/, writes dossier.json)
- `vendor/makefun-game.ts` — the kit's library, unchanged
- `LICENSE` — MIT
