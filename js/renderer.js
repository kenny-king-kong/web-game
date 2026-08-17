// Draws the char/color buffers to a canvas efficiently (run-length encoding
// consecutive same-color characters into a single fillText call per run),
// plus the HUD and minimap overlay.

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = CONFIG.COLS * CONFIG.CHAR_W;
    canvas.height = CONFIG.ROWS * CONFIG.CHAR_H;
    this.ctx.textBaseline = 'top';
    this.ctx.font = `${CONFIG.CHAR_H - 3}px "Courier New", monospace`;
  }

  drawFrame(frame) {
    const { ctx } = this;
    const { CHAR_W, CHAR_H, COLS, ROWS } = CONFIG;
    ctx.fillStyle = '#0c0e14';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let row = 0; row < ROWS; row++) {
      const chars = frame.chars[row];
      const colors = frame.colors[row];
      const y = row * CHAR_H;
      let runStart = 0;
      let runColor = colors[0];
      for (let col = 1; col <= COLS; col++) {
        if (col === COLS || colors[col] !== runColor) {
          const runChars = chars.slice(runStart, col);
          const rgb = parseRgbString(runColor);
          ctx.fillStyle = `rgb(${rgb[0] * 0.32 | 0},${rgb[1] * 0.32 | 0},${rgb[2] * 0.32 | 0})`;
          ctx.fillRect(runStart * CHAR_W, y, (col - runStart) * CHAR_W, CHAR_H);
          if (runChars.some((c) => c !== ' ')) {
            ctx.fillStyle = runColor;
            ctx.fillText(runChars.join(''), runStart * CHAR_W, y);
          }
          if (col < COLS) {
            runStart = col;
            runColor = colors[col];
          }
        }
      }
    }
  }

  drawHUD(player, fps, showHelp) {
    const { ctx } = this;
    ctx.font = '14px "Courier New", monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(8, 8, 260, 66);
    ctx.fillStyle = '#9be89b';
    ctx.fillText(`pos  x:${player.x.toFixed(1)}  y:${player.y.toFixed(1)}`, 16, 14);
    ctx.fillText(`heading ${compassHeading(player.angle)}   fps ${fps}`, 16, 32);
    ctx.fillStyle = '#dddddd';
    ctx.fillText(`[click canvas to look around]  H: help`, 16, 50);

    if (showHelp) {
      const lines = [
        'WASD / Arrows: move    Mouse (after click): look',
        'A/D: strafe   Left/Right arrows: turn',
        'Esc: release mouse     H: toggle this help',
      ];
      const w = 460, h = 20 + lines.length * 18;
      const x = this.canvas.width / 2 - w / 2;
      const y = this.canvas.height - h - 20;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#ffe28a';
      lines.forEach((l, i) => ctx.fillText(l, x + 14, y + 10 + i * 18));
    }
  }

  drawMinimap(player, city) {
    const { ctx } = this;
    const SPAN = 17; // cells shown each direction is SPAN/2
    const size = 150;
    const cell = size / SPAN;
    const ox = this.canvas.width - size - 14;
    const oy = 14;

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(ox - 4, oy - 4, size + 8, size + 8);

    const cx = Math.floor(player.x);
    const cy = Math.floor(player.y);
    const half = Math.floor(SPAN / 2);

    for (let gy = -half; gy <= half; gy++) {
      for (let gx = -half; gx <= half; gx++) {
        const x = cx + gx, y = cy + gy;
        if (x < 0 || y < 0 || x >= city.size || y >= city.size) continue;
        const c = city.grid[y][x];
        let color = '#333';
        if (c.type === CELL.BUILDING) color = '#8a8a92';
        else if (c.type === CELL.PARK) color = '#2f6b3a';
        else if (c.type === CELL.SIDEWALK) color = '#5a5a55';
        else color = '#232323';
        ctx.fillStyle = color;
        ctx.fillRect(ox + (gx + half) * cell, oy + (gy + half) * cell, cell + 0.5, cell + 0.5);
      }
    }

    for (const s of city.sprites) {
      const gx = Math.floor(s.x) - cx, gy = Math.floor(s.y) - cy;
      if (Math.abs(gx) > half || Math.abs(gy) > half) continue;
      ctx.fillStyle = s.type === 'tree' ? '#3fae55' : (s.color || '#c94b4b');
      const px = ox + (gx + half) * cell + cell / 2;
      const py = oy + (gy + half) * cell + cell / 2;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1, cell * 0.28), 0, Math.PI * 2);
      ctx.fill();
    }

    // Player marker + facing tick.
    const ppx = ox + half * cell + cell / 2;
    const ppy = oy + half * cell + cell / 2;
    ctx.fillStyle = '#ffdd55';
    ctx.beginPath();
    ctx.arc(ppx, ppy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffdd55';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ppx, ppy);
    ctx.lineTo(ppx + Math.cos(player.angle) * 10, ppy + Math.sin(player.angle) * 10);
    ctx.stroke();
  }
}
