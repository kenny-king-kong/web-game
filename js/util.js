// Small shared helpers: seeded RNG, hashing, math utilities.

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic pseudo-random noise in [0,1) for a pair of numbers.
// Used for floor/sky texture dithering (not for city layout).
function hash2(x, y) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
  t = clamp(t, 0, 1);
  const r = Math.round(lerp(c1[0], c2[0], t));
  const g = Math.round(lerp(c1[1], c2[1], t));
  const b = Math.round(lerp(c1[2], c2[2], t));
  return `rgb(${r},${g},${b})`;
}

function parseRgbString(str) {
  const m = /rgb\((\d+),(\d+),(\d+)\)/.exec(str);
  if (!m) return [0, 0, 0];
  return [+m[1], +m[2], +m[3]];
}

function shadeChar(dist, maxDist) {
  const ramp = CONFIG.SHADE_RAMP;
  const t = clamp(dist / maxDist, 0, 1);
  const idx = Math.min(ramp.length - 1, Math.floor(t * ramp.length));
  return ramp[idx];
}

function compassHeading(angle) {
  const dirs = ['E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW', 'N', 'NNE', 'NE', 'ENE'];
  let a = angle % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  const idx = Math.round((a / (Math.PI * 2)) * dirs.length) % dirs.length;
  return dirs[idx];
}
