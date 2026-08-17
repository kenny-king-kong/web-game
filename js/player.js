// Player state + movement/collision against the city grid and sprites.

class Player {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.angle = angle;
  }
}

function isBlockedCircle(city, sprites, x, y, r) {
  // Grid solidity: sample the bounding box corners + center.
  const pts = [
    [x, y],
    [x - r, y - r], [x + r, y - r],
    [x - r, y + r], [x + r, y + r],
  ];
  for (const [px, py] of pts) {
    if (!isWalkable(city, px, py)) return true;
  }
  // Sprite (tree/car) collision.
  for (const s of sprites) {
    const dx = s.x - x, dy = s.y - y;
    const rr = r + s.radius;
    if (dx * dx + dy * dy < rr * rr) return true;
  }
  return false;
}

function updatePlayer(player, input, city, sprites, dt) {
  let rot = 0;
  if (input.keys.has('ArrowLeft')) rot -= 1;
  if (input.keys.has('ArrowRight')) rot += 1;
  player.angle += rot * CONFIG.ROT_SPEED * dt;
  player.angle += input.consumeMouseDx() * CONFIG.MOUSE_SENSITIVITY;

  let fwd = 0;
  let strafe = 0;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) fwd += 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) fwd -= 1;
  if (input.keys.has('KeyD')) strafe += 1;
  if (input.keys.has('KeyA')) strafe -= 1;

  if (fwd === 0 && strafe === 0) return;

  const len = Math.hypot(fwd, strafe) || 1;
  fwd /= len;
  strafe /= len;

  const dirX = Math.cos(player.angle);
  const dirY = Math.sin(player.angle);
  const perpX = -dirY;
  const perpY = dirX;

  const speed = fwd !== 0 ? CONFIG.MOVE_SPEED : CONFIG.STRAFE_SPEED;
  const dx = (dirX * fwd + perpX * strafe) * speed * dt;
  const dy = (dirY * fwd + perpY * strafe) * speed * dt;

  const r = CONFIG.PLAYER_RADIUS;
  if (!isBlockedCircle(city, sprites, player.x + dx, player.y, r)) {
    player.x += dx;
  }
  if (!isBlockedCircle(city, sprites, player.x, player.y + dy, r)) {
    player.y += dy;
  }
}
