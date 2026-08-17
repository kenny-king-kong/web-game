// Keyboard + pointer-lock mouse input.

class Input {
  constructor(canvas) {
    this.keys = new Set();
    this._mouseDx = 0;
    this.locked = false;

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    canvas.addEventListener('click', () => {
      canvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });

    document.addEventListener('mousemove', (e) => {
      if (this.locked) this._mouseDx += e.movementX;
    });
  }

  consumeMouseDx() {
    const dx = this._mouseDx;
    this._mouseDx = 0;
    return dx;
  }
}
