// Global tunables for the ASCII 3D engine.
const CONFIG = {
  // Character-grid "resolution" of the 3D viewport.
  COLS: 112,
  ROWS: 48,

  // Pixel size of a single monospace character cell on the canvas.
  CHAR_W: 9,
  CHAR_H: 17,

  // Horizontal field of view.
  FOV: (66 * Math.PI) / 180,

  MAX_DEPTH: 26,

  // Movement.
  MOVE_SPEED: 4.4,     // world units / sec, forward-back
  STRAFE_SPEED: 3.7,   // world units / sec, left-right
  ROT_SPEED: 2.4,      // rad / sec, keyboard turning
  MOUSE_SENSITIVITY: 0.0024,
  PLAYER_RADIUS: 0.26,

  // Projection scale shared by wall-height and floor-casting so both
  // agree on the same virtual "screen distance". Tuned by eye.
  PROJ_K: 1.0,

  MAP_SIZE: 48,
  CITY_SEED: 1337,

  // Shading ramp, near -> far.
  SHADE_RAMP: '@%#*+=-:. ',

  RENDER_DIST_FOG: 20, // distance at which floor/sky start fading to bg
};

const CELL = {
  ROAD: 0,
  SIDEWALK: 1,
  PARK: 2,
  BUILDING: 3,
};
