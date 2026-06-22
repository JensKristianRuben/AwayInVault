<script lang="ts">
  import { onMount } from 'svelte';
  import { limitSpeed, applyBrownianDrift, setupCanvas } from './particles';

  // Antal partikler i simulationen
  const NUM_BOIDS = 400;

  // Simulation indstillinger for rolig drift
  const maxSpeed = 1.4;
  const maxForce = 0.08;
  const formationWeight = 2.2;

  // Genbrugeligt canvas til tekst-sampling for at undgå garbage collection lag
  let tempCanvas: HTMLCanvasElement | null = null;

  // Sampler pixelpunkter fra en tekststreng
  function sampleTextPoints(text: string, fontSize: number, numSamples: number) {
    const points: Array<{ x: number; y: number }> = [];
    if (typeof document === 'undefined') {
      return Array.from({ length: numSamples }, () => ({ x: 0, y: 0 }));
    }
    try {
      if (!tempCanvas) {
        tempCanvas = document.createElement('canvas');
      }
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error("Could not get 2D context");
      
      // Sæt midlertidig canvas størrelse stor nok til teksten
      tempCanvas.width = 1200;
      tempCanvas.height = 160;
      
      tempCtx.fillStyle = '#ffffff';
      tempCtx.font = `bold ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
      tempCtx.textBaseline = 'middle';
      tempCtx.textAlign = 'center';
      
      if ('letterSpacing' in tempCtx) {
        tempCtx.letterSpacing = "6px";
      }
      
      const cx = tempCanvas.width / 2;
      const cy = tempCanvas.height / 2;
      tempCtx.fillText(text, cx, cy);
      
      const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imgData.data;
      
      const pixelPoints: Array<{ x: number; y: number }> = [];
      // Scan pixels med trin 2 for hurtig afvikling
      for (let y = 0; y < tempCanvas.height; y += 2) {
        for (let x = 0; x < tempCanvas.width; x += 2) {
          const idx = (y * tempCanvas.width + x) * 4;
          const alpha = data[idx + 3];
          if (alpha > 110) { // Tærskel for tekst-kant
            pixelPoints.push({
              x: x - cx,
              y: y - cy
            });
          }
        }
      }
      
      if (pixelPoints.length === 0) {
        return Array.from({ length: numSamples }, () => ({ x: 0, y: 0 }));
      }
      
      // Fordel punkterne jævnt over de scannede pixels
      for (let i = 0; i < numSamples; i++) {
        const pixelIdx = Math.floor((i / numSamples) * pixelPoints.length);
        points.push(pixelPoints[pixelIdx]);
      }
    } catch (e) {
      console.error("Fejl under tekst-sampling:", e);
      return Array.from({ length: numSamples }, () => ({ x: 0, y: 0 }));
    }
    return points;
  }

  // Canvas og dimensions
  let canvasElement = $state<HTMLCanvasElement | null>(null);
  let width = $state(800);
  let height = $state(600);

  // Svelte 5 Props (styret af landingssiden udefra)
  let { mode = 'flock', textAssembled = $bindable(false), logoElement = null } = $props();
  let particleOpacity = $state(1.0);
  let canvasTextOpacity = $state(0.0);
  let kcx = $state(0);
  let kcy = $state(0);

  // Interaktivitet & Trusler (Hacker-angreb)
  let mouseX = $state(-1000);
  let mouseY = $state(-1000);
  let isMousePresent = $state(false);
  let clickThreats = $state<Array<{
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    alpha: number;
    forceMultiplier: number;
  }>>([]);

  function handleMouseMove(e: MouseEvent) {
    if (!canvasElement) return;
    const rect = canvasElement.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    isMousePresent = true;
  }

  function handleMouseLeave() {
    isMousePresent = false;
  }

  function handleCanvasClick(e: MouseEvent) {
    if (!canvasElement) return;
    const rect = canvasElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Opret en diskret, elegant ringbølge
    clickThreats.push({
      x,
      y,
      radius: 0,
      maxRadius: 180,
      alpha: 1.0,
      forceMultiplier: 3.5
    });
  }

  // Professionelle og dæmpede grønne nuancer (salvie, smaragd, skovgrøn)
  const greenShades = [
    'rgba(16, 185, 129, 0.7)',   // Emerald
    'rgba(52, 211, 153, 0.7)',   // Muted Mint
    'rgba(5, 150, 105, 0.7)',    // Medium Emerald
    'rgba(110, 231, 183, 0.7)',  // Soft Sage
    'rgba(4, 120, 87, 0.7)',     // Darker Forest
    'rgba(167, 243, 208, 0.6)'   // Light Emerald/Gray
  ];

  // Boid-klassen
  class Boid {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    ax: number;
    ay: number;
    color: string;
    size: number;
    
    // Targets for de forskellige formationer
    keyX = 0;
    keyY = 0;
    shieldX = 0;
    shieldY = 0;
    lockX = 0;
    lockY = 0;

    constructor(id: number) {
      this.id = id;
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * maxSpeed;
      this.vy = (Math.random() - 0.5) * maxSpeed;
      this.ax = 0;
      this.ay = 0;
      this.color = greenShades[id % greenShades.length];
      this.size = 1.2 + Math.random() * 1.0; // Meget små, fine partikler (mellem 1.2px og 2.2px)
    }

    update(speedLimit = maxSpeed) {
      // Opdater hastighed baseret på acceleration
      this.vx += this.ax;
      this.vy += this.ay;

      // Begræns hastighed vha. fælles math helper
      const limited = limitSpeed(this.vx, this.vy, speedLimit);
      this.vx = limited.vx;
      this.vy = limited.vy;

      // Opdater position
      this.x += this.vx;
      this.y += this.vy;

      // Nulstil acceleration for næste frame
      this.ax = 0;
      this.ay = 0;
    }

    applyForce(fx: number, fy: number) {
      this.ax += fx;
      this.ay += fy;
    }

    // Blød indramning, så partikler ikke forsvinder udenfor skærmen
    boundaries() {
      const margin = width < 768 ? 10 : 60;
      let forceX = 0;
      let forceY = 0;

      if (this.x < margin) forceX = maxForce * 0.8;
      else if (this.x > width - margin) forceX = -maxForce * 0.8;

      if (this.y < margin) forceY = maxForce * 0.8;
      else if (this.y > height - margin) forceY = -maxForce * 0.8;

      if (forceX !== 0 || forceY !== 0) {
        this.applyForce(forceX, forceY);
      }
    }
  }

  // Liste med alle boids
  let boids: Boid[] = [];

  // Beregn formationstargets for alle boids (Responsiv nøgle, skjold og lås)
  function updateFormationTargets() {
    const scale = Math.min(width, height);
    const cx = width * 0.5; // Midten for Shield og Lock
    const cy = height * 0.65; // Flyttet ned under knapperne

    // --- 1. TEXT FORMATION (AWAYINVAULT) ---
    if (logoElement) {
      const rect = logoElement.getBoundingClientRect();
      kcx = rect.left + rect.width / 2;
      kcy = rect.top + rect.height / 2;
    } else {
      kcx = width * 0.5;
      kcy = (height * 0.5) - (height * 0.08) - 36;
    }
    const textPoints = sampleTextPoints("AWAYINVAULT", 40, NUM_BOIDS);

    // --- 2. SHIELD FORMATION ---
    const sw = scale * 0.17;
    const sh = scale * 0.21;
    const numSOuter = Math.floor(NUM_BOIDS * 0.45);
    const numSInner = Math.floor(NUM_BOIDS * 0.30);
    const numSCheck = NUM_BOIDS - (numSOuter + numSInner);

    // --- 3. LOCK FORMATION ---
    const lw = scale * 0.15;
    const lh = scale * 0.17;
    const numLBody = Math.floor(NUM_BOIDS * 0.50);
    const numLArch = Math.floor(NUM_BOIDS * 0.30);
    const numLKeyhole = NUM_BOIDS - (numLBody + numLArch);

    boids.forEach((boid, index) => {
      // --- Beregn Text Targets (AWAYINVAULT) ---
      const pt = textPoints[index] || { x: 0, y: 0 };
      boid.keyX = kcx + pt.x + (Math.random() - 0.5) * 2;
      boid.keyY = kcy + pt.y + (Math.random() - 0.5) * 2;

      // --- Beregn Shield Targets ---
      let sx = cx, sy = cy;
      if (index < numSOuter) {
        // Ydre skjold outline
        const i = index;
        const half = Math.floor(numSOuter / 2);
        if (i < half) {
          const t = i / half;
          sx = cx - sw * (1 - t * t * 0.35);
          sy = cy - sh + t * sh * 2.0;
        } else {
          const t = (i - half) / (numSOuter - half);
          sx = cx + sw * (1 - t * t * 0.35);
          sy = cy - sh + t * sh * 2.0;
        }
        // Juster toppen så den buer pænt indad
        if (index < numSOuter * 0.15) {
          const t = (index / (numSOuter * 0.15)) * 2 - 1;
          sx = cx + t * sw;
          sy = cy - sh + (t * t - 1) * sh * 0.08;
        }
      } else if (index < numSOuter + numSInner) {
        // Indre skjold outline
        const i = index - numSOuter;
        const isw = sw * 0.72;
        const ish = sh * 0.72;
        const half = Math.floor(numSInner / 2);
        if (i < half) {
          const t = i / half;
          sx = cx - isw * (1 - t * t * 0.35);
          sy = cy - ish + t * ish * 2.0;
        } else {
          const t = (i - half) / (numSInner - half);
          sx = cx + isw * (1 - t * t * 0.35);
          sy = cy - ish + t * ish * 2.0;
        }
      } else {
        // Checkmark ikon indeni skjoldet
        const i = index - (numSOuter + numSInner);
        const half = Math.floor(numSCheck * 0.3);
        if (i < half) {
          const t = i / half;
          sx = cx - sw * 0.35 + t * sw * 0.28;
          sy = cy + t * sh * 0.28;
        } else {
          const t = (i - half) / (numSCheck - half);
          sx = cx - sw * 0.07 + t * sw * 0.52;
          sy = cy + sh * 0.28 - t * sh * 0.65;
        }
      }
      boid.shieldX = sx + (Math.random() - 0.5) * 4;
      boid.shieldY = sy + (Math.random() - 0.5) * 4;

      // --- Beregn Lock Targets ---
      let lx = cx, ly = cy;
      if (index < numLBody) {
        // Lock body (firkant)
        const i = index;
        const perimeter = i / numLBody;
        if (perimeter < 0.25) {
          lx = cx - lw + (perimeter / 0.25) * 2 * lw;
          ly = cy - lh * 0.15;
        } else if (perimeter < 0.5) {
          lx = cx + lw;
          ly = cy - lh * 0.15 + ((perimeter - 0.25) / 0.25) * lh * 0.95;
        } else if (perimeter < 0.75) {
          lx = cx + lw - ((perimeter - 0.5) / 0.25) * 2 * lw;
          ly = cy + lh * 0.8;
        } else {
          lx = cx - lw;
          ly = cy + lh * 0.8 - ((perimeter - 0.75) / 0.25) * lh * 0.95;
        }
      } else if (index < numLBody + numLArch) {
        // Bue (shackle) på toppen af låsen
        const i = index - numLBody;
        const angle = -Math.PI + (i / numLArch) * Math.PI;
        const ar = lw * 0.68;
        lx = cx + Math.cos(angle) * ar;
        ly = cy - lh * 0.15 + Math.sin(angle) * ar;
      } else {
        // Nøglehul i midten af låsen
        const i = index - (numLBody + numLArch);
        const half = Math.floor(numLKeyhole * 0.5);
        if (i < half) {
          const angle = (i / half) * Math.PI * 2;
          const kr = lw * 0.16;
          lx = cx + Math.cos(angle) * kr;
          ly = cy + lh * 0.18 + Math.sin(angle) * kr;
        } else {
          const t = (i - half) / (numLKeyhole - half);
          lx = cx + (t * 0.16 - 0.08) * lw;
          ly = cy + lh * 0.23 + t * lh * 0.25;
        }
      }
      boid.lockX = lx + (Math.random() - 0.5) * 4;
      boid.lockY = ly + (Math.random() - 0.5) * 4;
    });
  }

  $effect(() => {
    if (logoElement) {
      updateFormationTargets();
    }
  });

  // Fysik-trin (Rolig, tilfældig Brownian drift når tomgang)
  function runSimulationStep() {
    let arrivedCount = 0;

    for (let i = 0; i < boids.length; i++) {
      const boid = boids[i];

      // Blødt frastød fra musen (kører i alle tilstande, diskret og professionel)
      if (isMousePresent) {
        const dx = boid.x - mouseX;
        const dy = boid.y - mouseY;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0 && d < 100) {
          const strength = (100 - d) / 100;
          const forceX = (dx / d) * maxSpeed * strength * 0.8 - boid.vx;
          const forceY = (dy / d) * maxSpeed * strength * 0.8 - boid.vy;
          const f = Math.sqrt(forceX * forceX + forceY * forceY);
          if (f > maxForce) {
            boid.applyForce((forceX / f) * maxForce * 1.5, (forceY / f) * maxForce * 1.5);
          }
        }
      }

      // Blødt skub fra klik-impulser
      for (let j = clickThreats.length - 1; j >= 0; j--) {
        const threat = clickThreats[j];
        const dx = boid.x - threat.x;
        const dy = boid.y - threat.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0 && d < threat.radius + 30) {
          const strength = Math.max(0, 1 - (d / (threat.maxRadius + 30)));
          const forceX = (dx / d) * maxSpeed * strength * threat.forceMultiplier * threat.alpha - boid.vx;
          const forceY = (dy / d) * maxSpeed * strength * threat.forceMultiplier * threat.alpha - boid.vy;
          const f = Math.sqrt(forceX * forceX + forceY * forceY);
          if (f > maxForce) {
            boid.applyForce((forceX / f) * maxForce * 2.2, (forceY / f) * maxForce * 2.2);
          }
        }
      }

      if (mode === 'flock') {
        // Rolig Brownian drift vha. fælles helper
        const drift = applyBrownianDrift(boid.vx, boid.vy, 0.12);
        boid.vx = drift.vx;
        boid.vy = drift.vy;
        
        const speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy);
        if (speed < 0.2) {
          const angle = Math.random() * Math.PI * 2;
          boid.vx = Math.cos(angle) * 0.4;
          boid.vy = Math.sin(angle) * 0.4;
        }

        boid.boundaries();
      } else {
        // En af formationerne er aktiv ('key', 'shield', 'lock')
        let tx = boid.x;
        let ty = boid.y;

        if (mode === 'key') {
          tx = boid.keyX;
          ty = boid.keyY;
        } else if (mode === 'shield') {
          tx = boid.shieldX;
          ty = boid.shieldY;
        } else if (mode === 'lock') {
          tx = boid.lockX;
          ty = boid.lockY;
        }

        const dx = tx - boid.x;
        const dy = ty - boid.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Tæl partikler der er ankommet til deres position (indenfor 3px)
        if (dist < 3.0) {
          arrivedCount++;
        }

        let steerX = 0;
        let steerY = 0;

        // Balanceret hastighed og acceleration for en blød 2.5s formation
        const formMaxSpeed = 8.5;
        const formMaxForce = 0.65;

        if (dist > 2) {
          // Proportional acceleration for blød indflyvning
          const speedFactor = Math.min(formMaxSpeed, dist * 0.45);
          const targetVx = (dx / dist) * speedFactor;
          const targetVy = (dy / dist) * speedFactor;

          steerX = targetVx - boid.vx;
          steerY = targetVy - boid.vy;

          const f = Math.sqrt(steerX * steerX + steerY * steerY);
          if (f > formMaxForce) {
            steerX = (steerX / f) * formMaxForce;
            steerY = (steerY / f) * formMaxForce;
          }

          // Magnetisk opbremsning tæt på målet for at modvirke jitter
          if (dist < 25) {
            boid.vx *= 0.82;
            boid.vy *= 0.82;
          }
         } else {
            // Snap præcist til målet og frys hastigheden fuldstændig
            boid.x = tx;
            boid.y = ty;
            boid.vx = 0;
            boid.vy = 0;
            steerX = 0;
            steerY = 0;
          }

        boid.applyForce(steerX * formationWeight, steerY * formationWeight);
      }

      // Tillad højere hastighed under formation (8.5) end i tilfældig drift (maxSpeed)
      const limit = mode === 'flock' ? maxSpeed : 8.5;
      boid.update(limit);
    }

    // Opdater den bindbare prop baseret på om partiklerne er på plaved
    if (mode === 'key') {
      // 98.5% svarer til at max 6 partikler ud af 400 er undervejs
      textAssembled = (arrivedCount >= NUM_BOIDS * 0.985);
    } else {
      textAssembled = false;
    }
  }

  // Start simulationen
  onMount(() => {
    if (!canvasElement) return;
    const ctx = canvasElement.getContext('2d')!;
    
    let animationFrameId: number;
    let isVisible = true;

    // Brug den fælles setupCanvas funktion
    const { resize, cleanup } = setupCanvas(canvasElement, (w, h) => {
      width = w;
      height = h;
      updateFormationTargets();
    });

    // Initialiser boids (nu spredt ud over hele det faktiske vindue!)
    boids = Array.from({ length: NUM_BOIDS }, (_, idx) => new Boid(idx));
    resize(); // Sætter canvas-størrelse og beregner targets

    // Genberegn når Google Fonts (Inter) er færdigindlæst for at undgå forskydning
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => {
        updateFormationTargets();
      });
    }

    // Loop
    const tick = () => {
      if (!isVisible) return;

      // Ryd canvas helt for at fjerne alle bevægelses-spor
      ctx.clearRect(0, 0, width, height);

      // Beregn fysik
      runSimulationStep();

      // Opdater partikel-opacitet og tekst-opacitet (melt-effekt)
      if (mode === 'key') {
        if (textAssembled) {
          particleOpacity = Math.max(0, particleOpacity - 0.04);
        } else {
          particleOpacity = Math.min(1.0, particleOpacity + 0.04);
        }
        canvasTextOpacity = 1.0 - particleOpacity;
      } else {
        particleOpacity = Math.min(1.0, particleOpacity + 0.04);
        canvasTextOpacity = Math.max(0, 1.0 - particleOpacity);
      }

      // Tegn alle boids som grønne cirkler (meget små, uden shadow for ren stil)
      if (particleOpacity > 0) {
        ctx.save();
        ctx.globalAlpha = particleOpacity;
        boids.forEach(boid => {
          ctx.beginPath();
          ctx.arc(boid.x, boid.y, boid.size, 0, Math.PI * 2);
          ctx.fillStyle = boid.color;
          ctx.fill();
        });
        ctx.restore();
      }

      // Tegn den solide grønne tekst direkte på canvas (helt synkroniseret med partiklerne)
      if (canvasTextOpacity > 0) {
        ctx.save();
        const grad = ctx.createLinearGradient(kcx - 180, 0, kcx + 180, 0);
        grad.addColorStop(0, '#10b981');
        grad.addColorStop(0.25, '#34d399');
        grad.addColorStop(0.5, '#059669');
        grad.addColorStop(0.75, '#a7f3d0');
        grad.addColorStop(1, '#047857');

        ctx.fillStyle = grad;
        ctx.font = `bold 40px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if ('letterSpacing' in ctx) {
          ctx.letterSpacing = "6px";
        }
        
        ctx.globalAlpha = canvasTextOpacity;
        ctx.fillText("AWAYINVAULT", kcx, kcy);
        ctx.restore();
      }

      // Opdater og tegn clickThreats (blide, lysegrønne/hvide bølger)
      for (let j = clickThreats.length - 1; j >= 0; j--) {
        const threat = clickThreats[j];
        threat.radius += 2.8;
        threat.alpha -= 0.012;

        if (threat.alpha <= 0 || threat.radius >= threat.maxRadius) {
          clickThreats.splice(j, 1);
          continue;
        }

        // Tegn chokbølgen (diskret, elegant hvid/grøn cirkel)
        ctx.strokeStyle = `rgba(167, 243, 208, ${threat.alpha * 0.25})`;
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(threat.x, threat.y, threat.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(52, 211, 153, ${threat.alpha * 0.1})`;
        ctx.beginPath();
        ctx.arc(threat.x, threat.y, threat.radius * 0.65, 0, Math.PI * 2);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    // IntersectionObserver til performance-optimering
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const wasVisible = isVisible;
        isVisible = entry.isIntersecting;
        if (isVisible && !wasVisible) {
          tick(); // Genstart loopet når elementet ruller ind på skærmen
        }
      });
    }, { threshold: 0.01 });

    observer.observe(canvasElement);
    tick();

    // Cleanup
    return () => {
      cleanup();
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  });
</script>

<canvas 
  bind:this={canvasElement}
  onmousemove={handleMouseMove}
  onmouseleave={handleMouseLeave}
  onclick={handleCanvasClick}
></canvas>

<style>
  canvas {
    display: block;
    width: 100vw;
    height: 100vh;
    background: transparent;
    position: absolute;
    top: 0;
    left: 0;
    margin: 0;
    padding: 0;
    overflow: hidden;
    z-index: 1;
  }
</style>
