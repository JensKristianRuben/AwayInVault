/**
 * Shared utility functions for canvas and particle simulations
 */

export interface Vector2D {
  vx: number;
  vy: number;
}

// Limits the speed of a 2D velocity vector
export function limitSpeed(vx: number, vy: number, maxSpeed: number): Vector2D {
  const speed = Math.sqrt(vx * vx + vy * vy);
  if (speed > maxSpeed && speed > 0) {
    return {
      vx: (vx / speed) * maxSpeed,
      vy: (vy / speed) * maxSpeed
    };
  }
  return { vx, vy };
}

// Adds Brownian drift (random noise) to a velocity vector
export function applyBrownianDrift(vx: number, vy: number, strength: number = 0.12): Vector2D {
  return {
    vx: vx + (Math.random() - 0.5) * strength,
    vy: vy + (Math.random() - 0.5) * strength
  };
}

// Set up high-DPI canvas scaling and handle resize automatically
export function setupCanvas(
  canvas: HTMLCanvasElement,
  onResize: (width: number, height: number, ctx: CanvasRenderingContext2D) => void
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { resize: () => {}, cleanup: () => {} };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const parent = canvas.parentElement;
    const width = parent ? parent.clientWidth : window.innerWidth;
    const height = parent ? parent.clientHeight : window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    onResize(width, height, ctx);
  };

  window.addEventListener('resize', resize);
  resize();

  return {
    resize,
    cleanup: () => {
      window.removeEventListener('resize', resize);
    }
  };
}
