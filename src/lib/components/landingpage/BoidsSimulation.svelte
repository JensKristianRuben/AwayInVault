<script lang="ts">
	import { onMount } from "svelte";
	import { limitSpeed, applyBrownianDrift, setupCanvas } from "./particles";

	// Svelte 5 Props (controlled from the landing page)
	let {
		mode = "flock",
		textAssembled = $bindable(false),
		logoElement = null,
		numBoids = 400,
	} = $props();

	// Number of particles in the simulation
	const NUM_BOIDS = $derived(numBoids);

	// Simulation settings for calm drift
	const maxSpeed = 1.4;
	const maxForce = 0.08;
	const formationWeight = 2.2;

	// Reusable canvas for text sampling to avoid garbage collection lag
	let tempCanvas: HTMLCanvasElement | null = null;

	// Samples pixel points from a text string
	function sampleTextPoints(text: string, fontSize: number, numSamples: number) {
		const points: Array<{ x: number; y: number }> = [];
		if (typeof document === "undefined") {
			return Array.from({ length: numSamples }, () => ({ x: 0, y: 0 }));
		}
		try {
			if (!tempCanvas) {
				tempCanvas = document.createElement("canvas");
			}
			const tempCtx = tempCanvas.getContext("2d");
			if (!tempCtx) throw new Error("Could not get 2D context");

			// Set temporary canvas size large enough for the text
			tempCanvas.width = 1200;
			tempCanvas.height = 160;

			tempCtx.fillStyle = "#ffffff";
			tempCtx.font = `bold ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
			tempCtx.textBaseline = "middle";
			tempCtx.textAlign = "center";

			if ("letterSpacing" in tempCtx) {
				tempCtx.letterSpacing = "6px";
			}

			const cx = tempCanvas.width / 2;
			const cy = tempCanvas.height / 2;
			tempCtx.fillText(text, cx, cy);

			const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
			const data = imgData.data;

			const pixelPoints: Array<{ x: number; y: number }> = [];
			// Scan pixels with step 2 for fast execution
			for (let y = 0; y < tempCanvas.height; y += 2) {
				for (let x = 0; x < tempCanvas.width; x += 2) {
					const idx = (y * tempCanvas.width + x) * 4;
					const alpha = data[idx + 3];
					if (alpha > 110) {
						// Threshold for text edge
						pixelPoints.push({
							x: x - cx,
							y: y - cy,
						});
					}
				}
			}

			if (pixelPoints.length === 0) {
				return Array.from({ length: numSamples }, () => ({ x: 0, y: 0 }));
			}

			// Distribute points evenly over scanned pixels
			for (let i = 0; i < numSamples; i++) {
				const pixelIdx = Math.floor((i / numSamples) * pixelPoints.length);
				points.push(pixelPoints[pixelIdx]);
			}
		} catch (e) {
			console.error("Error during text sampling:", e);
			return Array.from({ length: numSamples }, () => ({ x: 0, y: 0 }));
		}
		return points;
	}

	// Canvas og dimensions
	let canvasElement = $state<HTMLCanvasElement | null>(null);
	let width = $state(800);
	let height = $state(600);

	let particleOpacity = $state(1.0);
	let canvasTextOpacity = $state(0.0);
	let kcx = $state(0);
	let kcy = $state(0);

	// Interaktivitet & Trusler (Hacker-angreb)
	let mouseX = $state(-1000);
	let mouseY = $state(-1000);
	let isMousePresent = $state(false);
	let clickThreats = $state<
		Array<{
			x: number;
			y: number;
			radius: number;
			maxRadius: number;
			alpha: number;
			forceMultiplier: number;
		}>
	>([]);

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

		// Create a discrete, elegant ring wave
		clickThreats.push({
			x,
			y,
			radius: 0,
			maxRadius: 180,
			alpha: 1.0,
			forceMultiplier: 3.5,
		});
	}

	// Professional and muted green shades (sage, emerald, forest green)
	const greenShades = [
		"rgba(16, 185, 129, 0.7)", // Emerald
		"rgba(52, 211, 153, 0.7)", // Muted Mint
		"rgba(5, 150, 105, 0.7)", // Medium Emerald
		"rgba(110, 231, 183, 0.7)", // Soft Sage
		"rgba(4, 120, 87, 0.7)", // Darker Forest
		"rgba(167, 243, 208, 0.6)", // Light Emerald/Gray
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

		// Targets for the different formations
		keyX = 0;
		keyY = 0;
		shieldX = 0;
		shieldY = 0;
		lockX = 0;
		lockY = 0;
		scatterX = 0;
		scatterY = 0;

		constructor(id: number) {
			this.id = id;
			this.x = Math.random() * width;
			this.y = Math.random() * height;
			this.vx = (Math.random() - 0.5) * maxSpeed;
			this.vy = (Math.random() - 0.5) * maxSpeed;
			this.ax = 0;
			this.ay = 0;
			this.color = greenShades[id % greenShades.length];
			this.size = 1.2 + Math.random() * 1.0; // Very small, fine particles (between 1.2px and 2.2px)
		}

		update(speedLimit = maxSpeed) {
			// Update velocity based on acceleration
			this.vx += this.ax;
			this.vy += this.ay;

			// Limit speed using shared math helper
			const limited = limitSpeed(this.vx, this.vy, speedLimit);
			this.vx = limited.vx;
			this.vy = limited.vy;

			// Update position
			this.x += this.vx;
			this.y += this.vy;

			// Reset acceleration for next frame
			this.ax = 0;
			this.ay = 0;
		}

		applyForce(fx: number, fy: number) {
			this.ax += fx;
			this.ay += fy;
		}

		// Soft boundaries, so particles do not disappear off-screen
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

	// List of all boids
	let boids: Boid[] = [];

	// Calculate formation targets for all boids (Responsive key, shield, and lock)
	function updateFormationTargets() {
		const scale = Math.min(width, height);
		const cx = width * 0.5; // Center for Shield and Lock
		const cy = height * 0.65; // Moved down below the buttons

		// --- 1. TEXT FORMATION (AWAYINVAULT) ---
		if (logoElement) {
			const rect = logoElement.getBoundingClientRect();
			kcx = rect.left + rect.width / 2;
			kcy = rect.top + rect.height / 2;
		} else {
			kcx = width * 0.5;
			kcy = height * 0.5 - height * 0.08 - 36;
		}
		const textPoints = sampleTextPoints("AWAYINVAULT", 40, NUM_BOIDS);

		// --- 2. SHIELD FORMATION ---
		const sw = scale * 0.17;
		const sh = scale * 0.21;
		const numSOuter = Math.floor(NUM_BOIDS * 0.45);
		const numSInner = Math.floor(NUM_BOIDS * 0.3);
		const numSCheck = NUM_BOIDS - (numSOuter + numSInner);

		// --- 3. LOCK FORMATION ---
		const lw = scale * 0.15;
		const lh = scale * 0.17;
		const numLBody = Math.floor(NUM_BOIDS * 0.5);
		const numLArch = Math.floor(NUM_BOIDS * 0.3);
		const numLKeyhole = NUM_BOIDS - (numLBody + numLArch);

		boids.forEach((boid, index) => {
			// --- Beregn Text Targets (AWAYINVAULT) ---
			const pt = textPoints[index] || { x: 0, y: 0 };
			boid.keyX = kcx + pt.x + (Math.random() - 0.5) * 2;
			boid.keyY = kcy + pt.y + (Math.random() - 0.5) * 2;

			// --- Beregn Shield Targets ---
			let sx = cx,
				sy = cy;
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
				// Adjust the top so it curves nicely inward
				if (index < numSOuter * 0.15) {
					const t = (index / (numSOuter * 0.15)) * 2 - 1;
					sx = cx + t * sw;
					sy = cy - sh + (t * t - 1) * sh * 0.08;
				}
			} else if (index < numSOuter + numSInner) {
				// Inner shield outline
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
				// Checkmark icon inside the shield
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
			let lx = cx,
				ly = cy;
			if (index < numLBody) {
				// Lock body (rectangle)
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
				// Shackle on top of the lock
				const i = index - numLBody;
				const angle = -Math.PI + (i / numLArch) * Math.PI;
				const ar = lw * 0.68;
				lx = cx + Math.cos(angle) * ar;
				ly = cy - lh * 0.15 + Math.sin(angle) * ar;
			} else {
				// Keyhole in the center of the lock
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

			// --- Beregn Scatter Targets ---
			const scatterMargin = width < 768 ? 20 : 60;
			boid.scatterX = scatterMargin + Math.random() * (width - scatterMargin * 2);
			boid.scatterY = scatterMargin + Math.random() * (height - scatterMargin * 2);
		});
	}

	$effect(() => {
		if (logoElement) {
			updateFormationTargets();
		}
	});

	// Physics step (Calm, random Brownian drift when idle)
	function runSimulationStep() {
		let arrivedCount = 0;

		for (let i = 0; i < boids.length; i++) {
			const boid = boids[i];

			// Soft repulsion from the mouse (runs in all states, discrete and professional)
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

			// Soft push from click impulses
			for (let j = clickThreats.length - 1; j >= 0; j--) {
				const threat = clickThreats[j];
				const dx = boid.x - threat.x;
				const dy = boid.y - threat.y;
				const d = Math.sqrt(dx * dx + dy * dy);
				if (d > 0 && d < threat.radius + 30) {
					const strength = Math.max(0, 1 - d / (threat.maxRadius + 30));
					const forceX =
						(dx / d) * maxSpeed * strength * threat.forceMultiplier * threat.alpha - boid.vx;
					const forceY =
						(dy / d) * maxSpeed * strength * threat.forceMultiplier * threat.alpha - boid.vy;
					const f = Math.sqrt(forceX * forceX + forceY * forceY);
					if (f > maxForce) {
						boid.applyForce((forceX / f) * maxForce * 2.2, (forceY / f) * maxForce * 2.2);
					}
				}
			}

			if (mode === "flock") {
				// Calm Brownian drift using shared helper
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
				// One of the formations is active ('key', 'shield', 'lock', 'scatter')
				let tx = boid.x;
				let ty = boid.y;

				if (mode === "key") {
					tx = boid.keyX;
					ty = boid.keyY;
				} else if (mode === "shield") {
					tx = boid.shieldX;
					ty = boid.shieldY;
				} else if (mode === "lock") {
					tx = boid.lockX;
					ty = boid.lockY;
				} else if (mode === "scatter") {
					tx = boid.scatterX;
					ty = boid.scatterY;
				}

				const dx = tx - boid.x;
				const dy = ty - boid.y;
				const dist = Math.sqrt(dx * dx + dy * dy);

				// Count particles that have arrived at their position (within 3px)
				if (dist < 3.0) {
					arrivedCount++;
				}

				let steerX = 0;
				let steerY = 0;

				// Balanced speed and acceleration for a smooth 2.5s formation
				const formMaxSpeed = 8.5;
				const formMaxForce = 0.65;

				if (dist > 2) {
					// Proportional acceleration for smooth arrival
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

					// Magnetic braking close to the target to counteract jitter
					if (dist < 25) {
						boid.vx *= 0.82;
						boid.vy *= 0.82;
					}
				} else {
					// Snap precisely to the target and freeze velocity completely
					boid.x = tx;
					boid.y = ty;
					boid.vx = 0;
					boid.vy = 0;
					steerX = 0;
					steerY = 0;
				}

				boid.applyForce(steerX * formationWeight, steerY * formationWeight);
			}

			// Allow higher speed during formation (8.5) than in random drift (maxSpeed)
			const limit = mode === "flock" ? maxSpeed : 8.5;
			boid.update(limit);
		}

		// Update the bindable prop based on whether the particles are in place
		if (mode === "key") {
			// 98.5% corresponds to a maximum of 6 particles out of 400 still traveling
			textAssembled = arrivedCount >= NUM_BOIDS * 0.985;
		} else {
			textAssembled = false;
		}
	}

	// Start simulationen
	onMount(() => {
		if (!canvasElement) return;
		const ctx = canvasElement.getContext("2d")!;

		let animationFrameId: number;
		let isVisible = true;

		// Use the shared setupCanvas function
		const { resize, cleanup } = setupCanvas(canvasElement, (w, h) => {
			width = w;
			height = h;
			updateFormationTargets();
		});

		// Initialize boids (now scattered across the actual window!)
		boids = Array.from({ length: NUM_BOIDS }, (_, idx) => new Boid(idx));
		resize(); // Sets canvas size and calculates targets

		// Recalculate when Google Fonts (Inter) finishes loading to avoid offset
		if (typeof document !== "undefined" && document.fonts) {
			document.fonts.ready.then(() => {
				updateFormationTargets();
			});
		}

		// Loop
		const tick = () => {
			if (!isVisible) return;

			// Clear canvas completely to remove all motion trails
			ctx.clearRect(0, 0, width, height);

			// Calculate physics
			runSimulationStep();

			// Update particle opacity and text opacity (melt effect)
			if (mode === "key") {
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

			// Draw all boids as green circles (very small, without shadow for clean style)
			if (particleOpacity > 0) {
				ctx.save();
				ctx.globalAlpha = particleOpacity;
				boids.forEach((boid) => {
					ctx.beginPath();
					ctx.arc(boid.x, boid.y, boid.size, 0, Math.PI * 2);
					ctx.fillStyle = boid.color;
					ctx.fill();
				});
				ctx.restore();
			}

			// Draw the solid green text directly on the canvas (fully synchronized with particles)
			if (canvasTextOpacity > 0) {
				ctx.save();
				const grad = ctx.createLinearGradient(kcx - 180, 0, kcx + 180, 0);
				grad.addColorStop(0, "#10b981");
				grad.addColorStop(0.25, "#34d399");
				grad.addColorStop(0.5, "#059669");
				grad.addColorStop(0.75, "#a7f3d0");
				grad.addColorStop(1, "#047857");

				ctx.fillStyle = grad;
				ctx.font = `bold 40px "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";

				if ("letterSpacing" in ctx) {
					ctx.letterSpacing = "6px";
				}

				ctx.globalAlpha = canvasTextOpacity;
				ctx.fillText("AWAYINVAULT", kcx, kcy);
				ctx.restore();
			}

			// Update and draw clickThreats (gentle, light green/white waves)
			for (let j = clickThreats.length - 1; j >= 0; j--) {
				const threat = clickThreats[j];
				threat.radius += 2.8;
				threat.alpha -= 0.012;

				if (threat.alpha <= 0 || threat.radius >= threat.maxRadius) {
					clickThreats.splice(j, 1);
					continue;
				}

				// Draw the shockwave (discrete, elegant white/green circle)
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

		// IntersectionObserver for performance optimization
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					const wasVisible = isVisible;
					isVisible = entry.isIntersecting;
					if (isVisible && !wasVisible) {
						tick(); // Restart loop when element scrolls into view
					}
				});
			},
			{ threshold: 0.01 },
		);

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
