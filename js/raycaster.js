// Core ASCII raycasting renderer: walls (DDA), floor/sky casting, and
// billboard sprite casting, all resolved to a grid of characters + colors.

const SKY_ZENITH = [40, 60, 110];
const SKY_HORIZON = [175, 205, 230];
const GRASS_NEAR = [46, 120, 58];
const GRASS_FAR = [18, 40, 24];
const ASPHALT_NEAR = [72, 72, 78];
const ASPHALT_FAR = [20, 20, 24];
const SIDEWALK_NEAR = [150, 150, 148];
const SIDEWALK_FAR = [35, 35, 36];
const BG = [12, 14, 20];

function renderFrame(player, city, time) {
  const { COLS, ROWS, FOV, MAX_DEPTH, PROJ_K } = CONFIG;
  const chars = new Array(ROWS);
  const colors = new Array(ROWS);
  for (let r = 0; r < ROWS; r++) {
    chars[r] = new Array(COLS).fill(' ');
    colors[r] = new Array(COLS).fill('#000');
  }
  const zbuffer = new Float64Array(COLS).fill(MAX_DEPTH);
  const horizon = ROWS * 0.5;

  const dirX = Math.cos(player.angle);
  const dirY = Math.sin(player.angle);
  const planeLen = Math.tan(FOV / 2);
  const planeX = -dirY * planeLen;
  const planeY = dirX * planeLen;

  for (let col = 0; col < COLS; col++) {
    const cameraX = (2 * col) / COLS - 1;
    const rayDirX = dirX + planeX * cameraX;
    const rayDirY = dirY + planeY * cameraX;

    let mapX = Math.floor(player.x);
    let mapY = Math.floor(player.y);

    const deltaDistX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
    const deltaDistY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);

    let stepX, sideDistX, stepY, sideDistY;
    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (player.x - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1 - player.x) * deltaDistX;
    }
    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (player.y - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1 - player.y) * deltaDistY;
    }

    let hit = false;
    let side = 0;
    let building = null;
    let steps = 0;
    while (!hit && steps < 128) {
      steps++;
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      if (mapX < 0 || mapY < 0 || mapX >= city.size || mapY >= city.size) {
        hit = true;
        building = null;
        break;
      }
      const cell = city.grid[mapY][mapX];
      if (cell.type === CELL.BUILDING) {
        hit = true;
        building = city.buildings[cell.id];
      }
    }

    let perpDist;
    if (side === 0) {
      perpDist = (mapX - player.x + (1 - stepX) / 2) / (rayDirX || 1e-9);
    } else {
      perpDist = (mapY - player.y + (1 - stepY) / 2) / (rayDirY || 1e-9);
    }
    perpDist = Math.max(0.0001, Math.abs(perpDist));
    if (!building) perpDist = MAX_DEPTH;
    zbuffer[col] = Math.min(perpDist, MAX_DEPTH);

    // Default (no building hit): treat as a zero-height wall centered on
    // the horizon, so sky fills the full upper half and floor the lower.
    let drawStart = Math.floor(horizon), drawEnd = Math.floor(horizon) - 1;
    if (building) {
      const heightFactor = building.height / 5;
      const lineHeight = Math.min(ROWS * 3, (ROWS * PROJ_K / perpDist) * heightFactor);
      drawStart = Math.max(0, Math.floor(horizon - lineHeight / 2));
      drawEnd = Math.min(ROWS - 1, Math.floor(horizon + lineHeight / 2));

      let wallX;
      if (side === 0) wallX = player.y + perpDist * rayDirY;
      else wallX = player.x + perpDist * rayDirX;
      wallX -= Math.floor(wallX);

      const fullLineHeight = (ROWS * PROJ_K / perpDist) * heightFactor;
      const topClip = horizon - fullLineHeight / 2;

      const baseShade = shadeChar(perpDist, MAX_DEPTH);
      const fog = clamp(perpDist / MAX_DEPTH, 0, 1);
      const baseColor = lerpColor(building.color, BG, fog * 0.85);
      const darkColor = lerpColor(building.color.map((c) => c * 0.55), BG, fog * 0.85);
      const litColor = lerpColor([255, 221, 130], BG, fog * 0.6);

      for (let row = drawStart; row <= drawEnd; row++) {
        const t = (row - topClip) / Math.max(1, fullLineHeight); // 0 top .. 1 bottom
        const winCol = Math.floor(wallX * 6);
        const winRow = Math.floor(t * (2 + building.height));
        const isWindow =
          winCol % 2 === 0 &&
          (winRow + building.windowPhase) % 2 === 0 &&
          t > 0.06 && t < 0.96;
        if (isWindow) {
          const lit = ((winCol * 7 + winRow * 3 + building.id * 5) % 4) !== 0;
          chars[row][col] = lit ? '#' : ':';
          colors[row][col] = lit ? litColor : darkColor;
        } else {
          chars[row][col] = side === 1 ? baseShade : shadeChar(perpDist * 1.15, MAX_DEPTH);
          colors[row][col] = side === 1 ? baseColor : darkColor;
        }
      }
    }

    // Sky above the wall slab (or full column if ray escaped the map).
    for (let row = 0; row < drawStart; row++) {
      const skyT = 1 - row / horizon; // 0 near horizon, 1 at zenith
      let ch = ' ';
      const n = hash2(col * 3.11 + 7, row * 1.7 + time * 0.02);
      if (skyT < 0.55 && n > 0.965) ch = '~';
      colors[row][col] = lerpColor(SKY_HORIZON, SKY_ZENITH, skyT);
      chars[row][col] = ch;
    }

    // Floor casting below the wall slab.
    const floorStart = Math.max(drawEnd + 1, Math.ceil(horizon) + 1);
    for (let row = floorStart; row < ROWS; row++) {
      const rowFromCenter = row - horizon;
      const rowDist = (ROWS * PROJ_K) / (2 * rowFromCenter);
      const worldX = player.x + rayDirX * rowDist;
      const worldY = player.y + rayDirY * rowDist;
      const cell = cellAt(city, worldX, worldY);
      const fog = clamp(rowDist / CONFIG.RENDER_DIST_FOG, 0, 1);

      let near, far, ch;
      const fracX = worldX - Math.floor(worldX);
      const fracY = worldY - Math.floor(worldY);
      if (cell.type === CELL.ROAD) {
        near = ASPHALT_NEAR; far = ASPHALT_FAR;
        const laneNoise = Math.floor((worldX + worldY) * 2.2);
        const onLane = laneNoise % 7 === 0 && (fracX < 0.12 || fracY < 0.12);
        ch = onLane ? '-' : shadeChar(rowDist, MAX_DEPTH);
        if (onLane) { colors[row][col] = lerpColor([230, 210, 90], BG, fog * 0.7); chars[row][col] = ch; continue; }
      } else if (cell.type === CELL.SIDEWALK) {
        near = SIDEWALK_NEAR; far = SIDEWALK_FAR;
        ch = (fracX < 0.06 || fracY < 0.06) ? '+' : '.';
      } else {
        near = GRASS_NEAR; far = GRASS_FAR;
        const n = hash2(Math.floor(worldX * 4), Math.floor(worldY * 4));
        ch = n > 0.6 ? "'" : n > 0.3 ? ',' : '.';
      }
      colors[row][col] = lerpColor(near, far, fog);
      chars[row][col] = ch;
    }
  }

  castSprites(player, city, dirX, dirY, planeX, planeY, zbuffer, chars, colors, horizon);

  return { chars, colors, horizon };
}

function castSprites(player, city, dirX, dirY, planeX, planeY, zbuffer, chars, colors, horizon) {
  const { COLS, ROWS, MAX_DEPTH } = CONFIG;
  const invDet = 1.0 / (planeX * dirY - dirX * planeY);

  const visible = [];
  for (const s of city.sprites) {
    const dx = s.x - player.x, dy = s.y - player.y;
    const dist2 = dx * dx + dy * dy;
    if (dist2 > MAX_DEPTH * MAX_DEPTH) continue;
    visible.push({ s, dist2 });
  }
  visible.sort((a, b) => b.dist2 - a.dist2); // far to near (painter's algorithm)

  for (const { s } of visible) {
    const spriteX = s.x - player.x;
    const spriteY = s.y - player.y;
    const transformX = invDet * (dirY * spriteX - dirX * spriteY);
    const depth = invDet * (-planeY * spriteX + planeX * spriteY);
    if (depth <= 0.15) continue;

    const glyph = GLYPHS[s.type];
    const rowsT = glyph.rows;
    const glyphW = rowsT[0].length;
    const glyphH = rowsT.length;

    // World-space height factor, using the same convention as building
    // wall scaling (heightFactor = worldHeight / 5).
    const heightFactor = s.type === 'tree' ? 0.5 : 0.24;
    const spriteScreenX = Math.floor((COLS / 2) * (1 + transformX / depth));
    const spriteH = Math.min(ROWS * 2, Math.abs(Math.floor((ROWS * CONFIG.PROJ_K / depth) * heightFactor)));
    const spriteW = Math.floor(spriteH * (glyphW / glyphH) * (CONFIG.CHAR_H / CONFIG.CHAR_W) * 0.5);
    if (spriteH < 1 || spriteW < 1) continue;

    // Feet rest on the ground row that floor-casting would compute for
    // this same distance, so sprites don't float or sink.
    const groundRow = horizon + (ROWS * CONFIG.PROJ_K) / (2 * depth);
    const drawEndY = Math.floor(groundRow);
    const drawStartY = drawEndY - spriteH;
    const drawStartX = Math.floor(spriteScreenX - spriteW / 2);
    const drawEndX = drawStartX + spriteW;

    const fog = clamp(depth / MAX_DEPTH, 0, 1);

    for (let col = Math.max(0, drawStartX); col < Math.min(COLS, drawEndX); col++) {
      if (depth >= zbuffer[col]) continue;
      const texX = Math.floor(((col - drawStartX) / spriteW) * glyphW);
      for (let row = Math.max(0, drawStartY); row < Math.min(ROWS, drawEndY); row++) {
        const texY = Math.floor(((row - drawStartY) / spriteH) * glyphH);
        const rowStr = rowsT[texY];
        if (!rowStr) continue;
        const ch = rowStr[texX];
        if (!ch || ch === ' ') continue;
        const baseColor = glyph.colorFor(ch, s);
        chars[row][col] = ch;
        colors[row][col] = mixHexFog(baseColor, fog);
      }
    }
  }
}

function mixHexFog(hex, fog) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return lerpColor([r, g, b], BG, fog * 0.75);
}
