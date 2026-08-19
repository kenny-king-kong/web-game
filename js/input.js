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

  // Wires up any [data-key] element (on-screen D-pad / turn buttons) so
  // holding it down adds that key code, same as a real keydown - the
  // movement code in player.js never has to know the difference.
  bindTouchControls(root) {
    root.querySelectorAll('[data-key]').forEach((el) => {
      const code = el.dataset.key;
      const press = (e) => {
        e.preventDefault();
        this.keys.add(code);
        el.classList.add('active');
      };
      const release = (e) => {
        e.preventDefault();
        this.keys.delete(code);
        el.classList.remove('active');
      };
      el.addEventListener('pointerdown', press);
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('pointerleave', release);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }
}
