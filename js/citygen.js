// Procedural city generator: produces a grid of cells (roads / sidewalks /
// park / building) plus lists of billboard sprites (trees, cars).

const BUILDING_PALETTE = [
  [176, 176, 184], // concrete grey
  [148, 138, 122], // tan
  [120, 132, 148], // steel blue
  [150, 110, 96],  // brick
  [104, 104, 112], // dark slate
  [168, 156, 140], // sandstone
];

const CAR_COLORS = ['#c94b4b', '#3f6fcf', '#d8c23a', '#e7e7e7', '#2c2c2c', '#4fae5c'];

function generateCity(size, seed) {
  const rng = mulberry32(seed);
  const grid = new Array(size);
  for (let y = 0; y < size; y++) {
    grid[y] = new Array(size).fill(null);
  }

  const ROAD_WIDTH = 2;
  const BLOCK_INTERIOR = 4;
  const PERIOD = ROAD_WIDTH + BLOCK_INTERIOR;

  const buildings = []; // {id, height, color}
  const sprites = [];   // {x,y,type,...}

  // Per-block random decisions (block index -> params), so both x/y loops
  // agree on the same block's footprint.
  const blockCount = Math.ceil(size / PERIOD);
  const blockPlan = new Map();
  function planFor(bx, by) {
    const key = bx + ',' + by;
    if (blockPlan.has(key)) return blockPlan.get(key);
    const isPark = rng() < 0.22;
    let plan;
    if (isPark) {
      plan = { park: true };
    } else {
      const fw = 2 + Math.floor(rng() * 2); // 2-3
      const fh = 2 + Math.floor(rng() * 2);
      const ox = Math.floor(rng() * (BLOCK_INTERIOR - fw + 1));
      const oy = Math.floor(rng() * (BLOCK_INTERIOR - fh + 1));
      const height = 2.5 + rng() * 8.5;
      const color = BUILDING_PALETTE[Math.floor(rng() * BUILDING_PALETTE.length)];
      const id = buildings.length;
      buildings.push({ id, height, color, windowPhase: Math.floor(rng() * 5) });
      plan = { park: false, fw, fh, ox, oy, id };
    }
    blockPlan.set(key, plan);
    return plan;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const onRoadX = (x % PERIOD) < ROAD_WIDTH;
      const onRoadY = (y % PERIOD) < ROAD_WIDTH;
      if (onRoadX || onRoadY) {
        grid[y][x] = { type: CELL.ROAD };
        continue;
      }
      const bx = Math.floor(x / PERIOD);
      const by = Math.floor(y / PERIOD);
      const lx = (x % PERIOD) - ROAD_WIDTH;
      const ly = (y % PERIOD) - ROAD_WIDTH;
      const plan = planFor(bx, by);

      if (plan.park) {
        grid[y][x] = { type: CELL.PARK };
        if (rng() < 0.32) {
          sprites.push({
            type: 'tree',
            x: x + 0.5 + (rng() - 0.5) * 0.7,
            y: y + 0.5 + (rng() - 0.5) * 0.7,
            radius: 0.28,
            seed: rng(),
          });
        }
        continue;
      }

      const inFootprint = lx >= plan.ox && lx < plan.ox + plan.fw && ly >= plan.oy && ly < plan.oy + plan.fh;
      if (inFootprint) {
        grid[y][x] = { type: CELL.BUILDING, id: plan.id };
      } else {
        grid[y][x] = { type: CELL.SIDEWALK };
        if (rng() < 0.14) {
          sprites.push({
            type: 'tree',
            x: x + 0.5 + (rng() - 0.5) * 0.4,
            y: y + 0.5 + (rng() - 0.5) * 0.4,
            radius: 0.24,
            seed: rng(),
          });
        }
      }
    }
  }

  // Scatter cars along road cells, each assigned to drive up and down its
  // own lane. A road cell's row or column is road for its *entire* span
  // (see onRoadX/onRoadY above, which don't depend on the other axis), so
  // a car that just drives straight along its spawn row/column can never
  // steer into a building - no pathfinding needed.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x].type !== CELL.ROAD) continue;
      if (rng() < 0.045) {
        const isRoadRow = (y % PERIOD) < ROAD_WIDTH;
        const isRoadCol = (x % PERIOD) < ROAD_WIDTH;
        const axis = isRoadRow && isRoadCol ? (rng() < 0.5 ? 'x' : 'y') : (isRoadRow ? 'x' : 'y');
        sprites.push({
          type: 'car',
          x: x + 0.5 + (axis === 'y' ? (rng() - 0.5) * 0.6 : 0),
          y: y + 0.5 + (axis === 'x' ? (rng() - 0.5) * 0.6 : 0),
          radius: 0.42,
          color: CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)],
          axis,
          dir: rng() < 0.5 ? 1 : -1,
          speed: 1.6 + rng() * 1.6,
        });
      }
    }
  }

  return { size, grid, buildings, sprites };
}

// Advances every car sprite along its lane, bouncing off the map edges
// so traffic keeps flowing indefinitely without ever leaving the road.
function updateTraffic(city, dt) {
  const size = city.size;
  const margin = 0.6;
  for (const s of city.sprites) {
    if (s.type !== 'car') continue;
    if (s.axis === 'x') {
      s.x += s.dir * s.speed * dt;
      if (s.x < margin) { s.x = margin; s.dir = 1; }
      else if (s.x > size - margin) { s.x = size - margin; s.dir = -1; }
    } else {
      s.y += s.dir * s.speed * dt;
      if (s.y < margin) { s.y = margin; s.dir = 1; }
      else if (s.y > size - margin) { s.y = size - margin; s.dir = -1; }
    }
  }
}

function cellAt(city, x, y) {
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  if (gx < 0 || gy < 0 || gx >= city.size || gy >= city.size) return { type: CELL.BUILDING, id: -1 };
  return city.grid[gy][gx];
}

function isWalkable(city, x, y) {
  const c = cellAt(city, x, y);
  return c.type !== CELL.BUILDING;
}

function findSpawn(city) {
  const mid = Math.floor(city.size / 2);
  for (let r = 0; r < city.size; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = mid + dx, y = mid + dy;
        if (x < 0 || y < 0 || x >= city.size || y >= city.size) continue;
        if (city.grid[y][x].type === CELL.ROAD) {
          return { x: x + 0.5, y: y + 0.5 };
        }
      }
    }
  }
  return { x: mid + 0.5, y: mid + 0.5 };
}
