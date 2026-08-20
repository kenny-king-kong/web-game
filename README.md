# web-game — ASCII City

A free-roam 3D world rendered entirely in ASCII characters, running in the
browser. It's a raycasting engine (the classic Wolfenstein-3D technique)
where walls, floor, sky, and objects are all drawn as colored text glyphs on
a `<canvas>` instead of textures.

The world is a small procedurally generated city: buildings of varying
height (with lit/dark windows), trees, cars driving up and down the roads,
lane markings, sidewalks, and parks. You walk around it freely and collide
with buildings, trees, and cars like solid objects.

## Running it

Any static file server works, e.g.:

```
python3 -m http.server 8000
```

then open `http://localhost:8000/` in a browser. (Opening `index.html`
directly from disk also works, but pointer-lock mouse-look requires
`http(s)://`, not `file://`, in most browsers.)

## Controls

- `W` / `S` or `Arrow Up` / `Arrow Down` — move forward / backward
- `A` / `D` — strafe left / right
- `Left` / `Right` arrows — turn (keyboard-only turning)
- Click the canvas, then move the mouse — look around (pointer lock)
- `Esc` — release the mouse
- `H` — toggle the help overlay
- On-screen D-pad + turn buttons below the canvas — full mouse/touch control,
  no keyboard required (works on phones/tablets too)

A minimap in the top-right corner shows nearby buildings, trees, and cars,
and your position/heading.

## How it works

- `js/citygen.js` — procedurally lays out a grid of city blocks (roads,
  building footprints with random height/color, parks, sidewalks) and
  scatters tree/car sprites, all from a seeded RNG for reproducibility. Each
  car is assigned a lane (its spawn row/column, which is guaranteed to be
  road for its entire length) and drives back and forth along it every
  frame via `updateTraffic()`, bouncing at the map edges - no pathfinding
  needed.
- `js/raycaster.js` — for every character-column on screen, casts a ray
  using DDA to find the nearest building wall, then separately casts the
  floor (road/sidewalk/grass) and sky per row, and finally draws trees/cars
  as depth-sorted, z-buffer-occluded ASCII billboards.
- `js/renderer.js` — blits the resulting character/color grid onto a
  `<canvas>`, batching consecutive same-color runs into single draw calls
  for performance, and draws the HUD/minimap.
- `js/player.js` — movement and circle-vs-grid / circle-vs-sprite collision.
- `js/input.js` — keyboard state, pointer-lock mouse look, and generic
  `[data-key]` binding so the on-screen D-pad/turn buttons feed the same key
  codes as a real keyboard.

All tunable constants (viewport resolution, field of view, speeds, city
size/seed, render distance, etc.) live in `js/config.js`.
