<script lang="ts">
  import { onMount } from 'svelte';
  import { limitSpeed, applyBrownianDrift, setupCanvas } from './particles';

  let canvasElement = $state<HTMLCanvasElement | null>(null);

  onMount(() => {
    if (!canvasElement) return;
    const ctx = canvasElement.getContext('2d')!;
    let width = 0;
    let height = 0;
    let isVisible = true;
    let animId: number;

    const NUM_ZK_BOIDS = 5;
    const maxSpeed = 1.0;
    
    const zkBoids = Array.from({ length: NUM_ZK_BOIDS }, (_, id) => ({
      x: Math.random() * 500,
      y: Math.random() * 500,
      vx: (Math.random() - 0.5) * 1.0,
      vy: (Math.random() - 0.5) * 1.0,
      size: 1.2 + Math.random() * 1.0,
      color: [
        'rgba(16, 185, 129, 0.65)',
        'rgba(52, 211, 153, 0.65)',
        'rgba(5, 150, 105, 0.65)',
        'rgba(167, 243, 208, 0.55)'
      ][id % 4]
    }));

    const { resize, cleanup } = setupCanvas(canvasElement, (w, h) => {
      width = w;
      height = h;
    });

    // Spread particles within actual dimensions initially
    zkBoids.forEach(b => {
      b.x = Math.random() * width;
      b.y = Math.random() * height;
    });

    const tickZkBoids = () => {
      if (!canvasElement || !isVisible) return;
      ctx.clearRect(0, 0, width, height);

      zkBoids.forEach(b => {
        // Physics and Brownian noise drift using helper functions
        const drift = applyBrownianDrift(b.vx, b.vy, 0.12);
        const limited = limitSpeed(drift.vx, drift.vy, maxSpeed);
        b.vx = limited.vx;
        b.vy = limited.vy;

        // Apply velocity
        b.x += b.vx;
        b.y += b.vy;

        // Boundaries bouncing
        if (b.x < b.size) {
          b.x = b.size;
          b.vx = Math.abs(b.vx);
        } else if (b.x > width - b.size) {
          b.x = width - b.size;
          b.vx = -Math.abs(b.vx);
        }

        if (b.y < b.size) {
          b.y = b.size;
          b.vy = Math.abs(b.vy);
        } else if (b.y > height - b.size) {
          b.y = height - b.size;
          b.vy = -Math.abs(b.vy);
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();
      });

      animId = requestAnimationFrame(tickZkBoids);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const wasVisible = isVisible;
        isVisible = entry.isIntersecting;
        if (isVisible && !wasVisible) {
          tickZkBoids();
        }
      });
    }, { threshold: 0.01 });

    observer.observe(canvasElement);
    tickZkBoids();

    return () => {
      cleanup();
      observer.disconnect();
      if (animId) cancelAnimationFrame(animId);
    };
  });
</script>

<canvas bind:this={canvasElement} class="zk-bg-canvas"></canvas>

<style>
  .zk-bg-canvas {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }
</style>
