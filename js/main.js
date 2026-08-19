// Wires everything together: city generation, game loop, input, rendering.

(function () {
  const canvas = document.getElementById('screen');
  const renderer = new Renderer(canvas);
  const input = new Input(canvas);
  input.bindTouchControls(document);

  const city = generateCity(CONFIG.MAP_SIZE, CONFIG.CITY_SEED);
  const spawn = findSpawn(city);
  const player = new Player(spawn.x, spawn.y, Math.PI / 4);

  let showHelp = true;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyH') showHelp = !showHelp;
  });

  let lastTime = performance.now();
  let fps = 60;
  let fpsAccum = 0, fpsFrames = 0, fpsTimer = 0;

  function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    updatePlayer(player, input, city, city.sprites, dt);

    const frame = renderFrame(player, city, now / 1000);
    renderer.drawFrame(frame);
    renderer.drawHUD(player, fps, showHelp);
    renderer.drawMinimap(player, city);

    fpsFrames++;
    fpsTimer += dt;
    if (fpsTimer >= 0.5) {
      fps = Math.round(fpsFrames / fpsTimer);
      fpsFrames = 0;
      fpsTimer = 0;
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
