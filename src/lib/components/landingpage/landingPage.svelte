<script lang="ts">
	import { onMount } from "svelte";
	import BoidsSimulation from "./BoidsSimulation.svelte";
	import ZkBackgroundSimulation from "./ZkBackgroundSimulation.svelte";
	import { fade, fly } from "svelte/transition";
	import { goto } from "$app/navigation";

	// State variabler
	let simMode = $state("flock"); // 'flock', 'key', 'scatter'
	let assemblyComplete = $state(false);
	let logoElement = $state<HTMLHeadingElement | null>(null);
	let isMobile = $state(false);

	// Notifikationssystem (professionelle, diskrete beskeder)
	let alertText = $state("");
	let showAlert = $state(false);

	function triggerAlert(message: string) {
		alertText = message;
		showAlert = true;
		setTimeout(() => {
			showAlert = false;
		}, 3500);
	}

	let defaultMode = $state("flock");
	let cycleTimer: any = null;

	function runCycle() {
		// Clear existing timer to avoid double cycles
		if (cycleTimer) {
			clearTimeout(cycleTimer);
			cycleTimer = null;
		}

		// The timer should only run in mobile view
		if (!isMobile) {
			return;
		}

		if (defaultMode === "flock") {
			cycleTimer = setTimeout(() => {
				if (!isMobile) return;
				defaultMode = "key";
				simMode = "key";
				runCycle();
			}, 10000);
		} else {
			cycleTimer = setTimeout(() => {
				if (!isMobile) return;
				defaultMode = "flock";
				simMode = "flock";
				runCycle();
			}, 4000);
		}
	}

	function scrollToContent() {
		const nextSection = document.querySelector(".zero-knowledge-section");
		if (nextSection) {
			nextSection.scrollIntoView({ behavior: "smooth" });
		}
	}

	onMount(() => {
		const checkIfMobile = () => {
			const wasMobile = isMobile;
			isMobile = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;

			if (isMobile) {
				// If we switch to mobile, or the timer is not running, we start the cycle
				if (!wasMobile || !cycleTimer) {
					simMode = defaultMode;
					runCycle();
				}
			} else {
				// On desktop/laptop we remove the timer and reset to standard flocking
				if (cycleTimer) {
					clearTimeout(cycleTimer);
					cycleTimer = null;
				}
				defaultMode = "flock";
				simMode = "flock";
			}
		};

		checkIfMobile();
		window.addEventListener("resize", checkIfMobile);

		return () => {
			if (cycleTimer) clearTimeout(cycleTimer);
			window.removeEventListener("resize", checkIfMobile);
		};
	});
</script>

<main>
	<!-- Hero sektion med partikler og logo -->
	<div class="hero-section">
		<!-- Soft green glow centered behind the logo -->
		<div class="logo-glow"></div>

		<!-- The particle simulation in the background (with two-way binding) -->
		<BoidsSimulation mode={simMode} bind:textAssembled={assemblyComplete} {logoElement} />

		<!-- Discreet, professional notification at the top -->
		{#if showAlert}
			<div class="toast-notification" transition:fly={{ y: -30, duration: 300 }}>
				<div class="toast-content">
					<span class="toast-dot"></span>
					<p class="toast-message">{alertText}</p>
				</div>
			</div>
		{/if}

		<!-- Centered, ultra-minimalistic UI Overlay -->
		<div class="ui-overlay">
			<div class="center-content" in:fade={{ duration: 400, delay: 200 }}>
				<!-- Larger, centered brand logo -->
				<h1 bind:this={logoElement} class="brand-logo" class:hovered-key={simMode === "key"}>
					AWAYINVAULT
				</h1>

				<!-- Centrerede knapper -->
				<div class="btn-group">
					<button
						class="btn btn-secondary"
						onmouseenter={() => {
							if (!isMobile) simMode = "key";
						}}
						onmouseleave={() => {
							if (!isMobile) simMode = defaultMode;
						}}
						onclick={() => goto("/login")}
					>
						Sign In
					</button>

					<button
						class="btn btn-primary"
						onmouseenter={() => {
							if (!isMobile) simMode = "scatter";
						}}
						onmouseleave={() => {
							if (!isMobile) simMode = defaultMode;
						}}
						onclick={() => goto("/register")}
					>
						Sign Up
					</button>
				</div>
			</div>
		</div>

		<!-- Discreet arrow pointing downwards to indicate more content -->
		<button
			class="scroll-indicator"
			onclick={scrollToContent}
			aria-label="Scroll down to read more"
			in:fade={{ duration: 300, delay: 600 }}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="scroll-arrow"
			>
				<polyline points="6 9 12 15 18 9" />
			</svg>
		</button>
	</div>

	<!-- Zero-Knowledge Sektion (Full View) -->
	<section class="feature-page zero-knowledge-section">
		<div class="container page-container">
			<div class="zk-title-container">
				<!-- Local background boids canvas restricted to text container -->
				<ZkBackgroundSimulation />

				<h2 class="page-title">Zero-Knowledge</h2>
				<p class="page-subtitle">
					Your data is encrypted on your device before it even leaves the browser. We never know
					your master password.
				</p>
			</div>

			<!-- Minimalistisk Zero-Knowledge Animation Flow -->
			<div class="zk-flow-animation">
				<!-- Node 1: Brugerens Enhed -->
				<div class="zk-node zk-device">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="node-icon"
					>
						<rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
						<line x1="8" y1="21" x2="16" y2="21" />
						<line x1="12" y1="17" x2="12" y2="21" />
					</svg>

					<div class="zk-data-box">
						<span class="text-plain">password123</span>
						<span class="text-cipher">x8B!9z#mQ2</span>
					</div>

					<!-- Master key (Encrypts locally only, never sent) -->
					<div class="zk-key-overlay">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="key-icon"
						>
							<path
								d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"
							/>
						</svg>
					</div>
				</div>

				<!-- Secure Connection Line -->
				<div class="zk-connector">
					<div class="zk-line"></div>
					<div class="zk-packet">
						<!-- Encrypted data packet symbol -->
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="packet-icon"
						>
							<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
							<path d="M7 11V7a5 5 0 0 1 10 0v4" />
						</svg>
					</div>

					<!-- Security shield as barrier in the middle -->
					<div class="zk-shield-barrier">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="barrier-icon"
						>
							<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
						</svg>
					</div>
				</div>

				<!-- Node 2: Encrypted Server Cloud -->
				<div class="zk-node zk-server">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="node-icon"
					>
						<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
					</svg>

					<!-- Database Padlock -->
					<div class="zk-vault-status">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="lock-icon"
						>
							<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
							<path d="M7 11V7a5 5 0 0 1 10 0v4" class="lock-shackle" />
						</svg>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Biometric Login Section (Full View) -->
	<section class="feature-page biometric-section">
		<div class="container page-container">
			<div class="biometric-title-wrapper">
				<h2 class="page-title">Biometric Login</h2>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="currentColor"
					class="biometric-title-icon"
					viewBox="0 0 16 16"
				>
					<path
						d="M8.06 6.5a.5.5 0 0 1 .5.5v.776a11.5 11.5 0 0 1-.552 3.519l-1.331 4.14a.5.5 0 0 1-.952-.305l1.33-4.141a10.5 10.5 0 0 0 .504-3.213V7a.5.5 0 0 1 .5-.5Z"
					/>
					<path
						d="M6.06 7a2 2 0 1 1 4 0 .5.5 0 1 1-1 0 1 1 0 1 0-2 0v.332q0 .613-.066 1.221A.5.5 0 0 1 6 8.447q.06-.555.06-1.115zm3.509 1a.5.5 0 0 1 .487.513 11.5 11.5 0 0 1-.587 3.339l-1.266 3.8a.5.5 0 0 1-.949-.317l1.267-3.8a10.5 10.5 0 0 0 .535-3.048A.5.5 0 0 1 9.569 8m-3.356 2.115a.5.5 0 0 1 .33.626L5.24 14.939a.5.5 0 1 1-.955-.296l1.303-4.199a.5.5 0 0 1 .625-.329"
					/>
					<path
						d="M4.759 5.833A3.501 3.501 0 0 1 11.559 7a.5.5 0 0 1-1 0 2.5 2.5 0 0 0-4.857-.833.5.5 0 1 1-.943-.334m.3 1.67a.5.5 0 0 1 .449.546 10.7 10.7 0 0 1-.4 2.031l-1.222 4.072a.5.5 0 1 1-.958-.287L4.15 9.793a9.7 9.7 0 0 0 .363-1.842.5.5 0 0 1 .546-.449Zm6 .647a.5.5 0 0 1 .5.5c0 1.28-.213 2.552-.632 3.762l-1.09 3.145a.5.5 0 0 1-.944-.327l1.089-3.145c.382-1.105.578-2.266.578-3.435a.5.5 0 0 1 .5-.5Z"
					/>
					<path
						d="M3.902 4.222a5 5 0 0 1 5.202-2.113.5.5 0 0 1-.208.979 4 4 0 0 0-4.163 1.69.5.5 0 0 1-.831-.556m6.72-.955a.5.5 0 0 1 .705-.052A4.99 4.99 0 0 1 13.059 7v1.5a.5.5 0 1 1-1 0V7a3.99 3.99 0 0 0-1.386-3.028.5.5 0 0 1-.051-.705M3.68 5.842a.5.5 0 0 1 .422.568q-.044.289-.044.59c0 .71-.1 1.417-.298 2.1l-1.14 3.923a.5.5 0 1 1-.96-.279L2.8 8.821A6.5 6.5 0 0 0 3.058 7q0-.375.054-.736a.5.5 0 0 1 .568-.422m8.882 3.66a.5.5 0 0 1 .456.54c-.084 1-.298 1.986-.64 2.934l-.744 2.068a.5.5 0 0 1-.941-.338l.745-2.07a10.5 10.5 0 0 0 .584-2.678.5.5 0 0 1 .54-.456"
					/>
					<path
						d="M4.81 1.37A6.5 6.5 0 0 1 14.56 7a.5.5 0 1 1-1 0 5.5 5.5 0 0 0-8.25-4.765.5.5 0 0 1-.5-.865m-.89 1.257a.5.5 0 0 1 .04.706A5.48 5.48 0 0 0 2.56 7a.5.5 0 0 1-1 0c0-1.664.626-3.184 1.655-4.333a.5.5 0 0 1 .706-.04ZM1.915 8.02a.5.5 0 0 1 .346.616l-.779 2.767a.5.5 0 1 1-.962-.27l.778-2.767a.5.5 0 0 1 .617-.346m12.15.481a.5.5 0 0 1 .49.51c-.03 1.499-.161 3.025-.727 4.533l-.07.187a.5.5 0 0 1-.936-.351l.07-.187c.506-1.35.634-2.74.663-4.202a.5.5 0 0 1 .51-.49"
					/>
				</svg>
			</div>
			<p class="page-subtitle">
				Fast and secure access with Windows Hello, FaceID, or fingerprint directly from all your
				devices.
			</p>
		</div>
	</section>

	<!-- Auto-Sync Section (Full View) -->
	<section class="feature-page sync-section">
		<div class="container page-container">
			<div class="sync-title-wrapper">
				<h2 class="page-title">Auto-Sync</h2>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="sync-title-icon"
				>
					<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
					<path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
					<path d="M16 16h5v5" />
				</svg>
			</div>
			<p class="page-subtitle">
				Save a password in one place, access it anywhere. Honestly, we didn't invent cross-device
				magic - that's just the World Wide Web doing what it does best.
			</p>
			<div>
				<a href="/how-it-works" class="read-more-link"> Read more </a>
			</div>
		</div>
	</section>
</main>

<style>
	@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap");

	:global(body) {
		margin: 0;
		padding: 0;
		overflow-x: hidden;
		background-color: var(--color-bg-main);
		font-family:
			"Inter",
			-apple-system,
			BlinkMacSystemFont,
			sans-serif;
		color: var(--color-text-base);
		-webkit-font-smoothing: antialiased;
	}

	main {
		width: 100%;
		position: relative;
	}

	.hero-section {
		position: relative;
		width: 100%;
		height: 100vh;
		overflow: hidden;
		background-color: var(--color-bg-main);
	}

	.logo-glow {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 320px;
		height: 320px;
		background-color: var(--color-accent);
		opacity: 0.045; /* Very faint and professional glow */
		filter: blur(100px);
		pointer-events: none;
		z-index: 1;
	}

	/* Centreret UI beholder */
	.ui-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 2;
		display: flex;
		justify-content: center;
		align-items: center;
		pointer-events: none; /* Let the mouse pass through to the particles */
		padding: 24px;
		box-sizing: border-box;
	}

	/* Indhold placeret centralt men trukket en smule op */
	.center-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		pointer-events: auto; /* Enable click on elements */
		transform: translateY(
			-8vh
		); /* Pulls elements up to make space for formations at the bottom/middle */
	}

	.brand-logo {
		font-size: 40px; /* Larger brand heading */
		font-weight: 700;
		letter-spacing: 6px;
		color: var(--color-text-base);
		margin: 0 0 28px 0;
		transition:
			color 0.5s ease,
			opacity 0.5s ease;
		background: linear-gradient(to right, var(--color-text-base), var(--color-accent));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.brand-logo.hovered-key {
		opacity: 0;
	}

	.btn-group {
		display: flex;
		gap: 12px;
		justify-content: center;
	}

	.btn {
		font-size: 12px;
		font-weight: 600;
		padding: 10px 22px;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
		border: none;
		outline: none;
		font-family: inherit;
		min-width: 110px;
	}

	.btn-primary {
		background-color: var(--color-accent);
		color: #ffffff;
		border: 1px solid var(--color-accent);
		box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
	}

	.btn-primary:hover {
		background-color: #059669;
		border-color: #059669;
		transform: translateY(-1px);
	}

	.btn-secondary {
		background: var(--color-bg-sidebar);
		color: var(--color-text-base);
		border: 1px solid var(--color-border-subtle);
	}

	.btn-secondary:hover {
		background: var(--color-border-subtle);
		border-color: var(--color-text-muted);
		transform: translateY(-1px);
	}

	/* Scroll indicator (arrow down) */
	.scroll-indicator {
		position: absolute;
		bottom: 30px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 3;
		background: transparent;
		border: none;
		outline: none;
		cursor: pointer;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 8px;
		opacity: 0.45;
		transition:
			opacity 0.3s ease,
			transform 0.3s ease;
	}

	.scroll-indicator:hover {
		opacity: 0.95;
		transform: translateX(-50%) scale(1.15);
	}

	.scroll-arrow {
		width: 26px;
		height: 26px;
		color: var(--color-text-base);
		animation: scroll-indicator-bounce 2s infinite ease-in-out;
	}

	@keyframes scroll-indicator-bounce {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(6px);
		}
	}

	/* Toast Notifikation */
	.toast-notification {
		position: absolute;
		top: 24px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 10;
		background: var(--color-bg-sidebar);
		border: 1px solid var(--color-accent);
		border-radius: 6px;
		padding: 8px 18px;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
		pointer-events: none;
	}

	.toast-content {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.toast-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background-color: var(--color-accent);
		box-shadow: 0 0 6px var(--color-accent);
	}

	.toast-message {
		margin: 0;
		font-size: 11px;
		font-weight: 500;
		color: var(--color-text-base);
		letter-spacing: 0.2px;
	}

	/* Enkelte feature sider (Full view scrolling) */
	.feature-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 100px 24px;
		box-sizing: border-box;
		position: relative;
		z-index: 3;
		width: 100%;
	}

	.zero-knowledge-section {
		background-color: var(--color-bg-main);
		align-items: flex-start;
		padding-top: 14vh;
	}

	.biometric-section,
	.sync-section {
		background-color: var(--color-bg-main);
	}

	.page-container {
		max-width: 1000px;
		width: 100%;
		margin: 0 auto;
		text-align: center;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 20px;
		position: relative;
		z-index: 2;
	}

	.zk-title-container {
		position: relative;
		max-width: 680px;
		width: 100%;
		margin: 0 auto 30px auto;
		padding: 12px 20px;
		box-sizing: border-box;
	}

	.zk-title-container h2,
	.zk-title-container p {
		position: relative;
		z-index: 2;
	}

	.page-title {
		font-size: 42px;
		font-weight: 700;
		letter-spacing: -1px;
		margin: 0 0 10px 0;
		background: linear-gradient(135deg, var(--color-text-base) 0%, var(--color-accent) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.page-subtitle {
		font-size: 17px;
		color: var(--color-text-muted);
		max-width: 650px;
		margin: 0 auto;
		line-height: 1.6;
	}

	/* Zero Knowledge Flow Animation */
	.zk-flow-animation {
		display: flex;
		align-items: center;
		justify-content: space-between;
		max-width: 760px;
		width: 100%;
		margin: 40px auto 0 auto;
		padding: 36px 48px;
		position: relative;
		box-sizing: border-box;
	}

	.zk-node {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		width: 140px;
		height: 140px;
		position: relative;
		transition: all 0.5s ease;
	}

	.node-icon {
		width: 44px;
		height: 44px;
		color: var(--color-text-muted);
		transition: color 0.5s ease;
	}

	.zk-device .node-icon {
		animation: zk-device-icon-glow 6s infinite ease-in-out;
	}

	.zk-server .node-icon {
		animation: zk-server-icon-glow 6s infinite ease-in-out;
	}

	/* Device Encryption Key Overlay */
	.zk-key-overlay {
		position: absolute;
		top: 16px;
		right: 16px;
		width: 20px;
		height: 20px;
		animation: zk-key-pulse-drop 6s infinite ease-in-out;
	}

	.key-icon {
		width: 100%;
		height: 100%;
		color: inherit;
		filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.15));
	}

	/* Data transformation on the screen */
	.zk-data-box {
		margin-top: 14px;
		font-family: "Courier New", Courier, monospace;
		font-size: 11px;
		height: 16px;
		position: relative;
		width: 110px;
		text-align: center;
		overflow: hidden;
	}

	.text-plain,
	.text-cipher {
		position: absolute;
		left: 0;
		right: 0;
		margin: 0 auto;
		font-weight: 600;
		letter-spacing: 0.5px;
	}

	.text-plain {
		color: var(--color-text-base);
		animation: zk-text-plain 6s infinite ease-in-out;
	}

	.text-cipher {
		color: #34d399;
		text-shadow: 0 0 6px rgba(52, 211, 153, 0.6);
		animation: zk-text-cipher 6s infinite ease-in-out;
	}

	/* Connecting path (lasers & pipes) */
	.zk-connector {
		position: relative;
		flex-grow: 1;
		height: 2px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 20px;
	}

	.zk-line {
		position: absolute;
		left: 0;
		right: 0;
		height: 2px;
		width: 100%;
		background: var(--color-border-subtle);
		animation: zk-line-glow 6s infinite ease-in-out;
	}

	/* Moving encrypted payload packet */
	.zk-packet {
		position: absolute;
		width: 24px;
		height: 24px;
		background: rgba(16, 185, 129, 0.08);
		border: 1px solid #34d399;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 0 8px rgba(52, 211, 153, 0.4);
		z-index: 2;
		animation: zk-packet-travel-desktop 6s infinite ease-in-out;
	}

	.packet-icon {
		width: 12px;
		height: 12px;
		color: #34d399;
	}

	/* Security barrier in the middle */
	.zk-shield-barrier {
		position: absolute;
		z-index: 3;
		background: var(--color-bg-main);
		padding: 5px;
		border-radius: 50%;
		border: 1px solid var(--color-border-subtle);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		box-sizing: border-box;
		animation: zk-shield-glow 6s infinite ease-in-out;
		color: var(--color-text-base);
	}

	.barrier-icon {
		width: 14px;
		height: 14px;
		color: inherit;
	}

	/* Cloud Vault Status */
	.zk-vault-status {
		position: absolute;
		bottom: 16px;
		width: 20px;
		height: 20px;
	}

	.lock-icon {
		width: 100%;
		height: 100%;
		color: var(--color-text-muted);
		animation: zk-lock-glow 6s infinite ease-in-out;
	}

	.lock-shackle {
		transform-origin: center bottom;
		animation: zk-shackle-close 6s infinite ease-in-out;
	}

	/* ANIMATION KEYFRAMES (Timeline of the loop) */

	/* Device Icon: Green when active, white when idle */
	@keyframes zk-device-icon-glow {
		0%,
		42% {
			color: #10b981;
			filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.35));
		}
		48%,
		94% {
			color: var(--color-text-muted);
			filter: none;
		}
		100% {
			color: #10b981;
			filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.35));
		}
	}

	/* Server Icon: Green when active, white when idle */
	@keyframes zk-server-icon-glow {
		0%,
		73% {
			color: var(--color-text-muted);
			filter: none;
		}
		77%,
		90% {
			color: #10b981;
			filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.3));
		}
		96%,
		100% {
			color: var(--color-text-muted);
			filter: none;
		}
	}

	/* 1. Key animation: Float (white), drop to encrypt (green), pulse, disappear, return */
	@keyframes zk-key-pulse-drop {
		0% {
			opacity: 1;
			color: var(--color-text-base);
			transform: translateY(0) scale(1);
		}
		18% {
			opacity: 1;
			color: var(--color-text-base);
			transform: translateY(-2px) scale(1);
		}
		25% {
			opacity: 1;
			color: #34d399;
			transform: translateY(30px) scale(1.1);
			filter: drop-shadow(0 0 8px rgba(52, 211, 153, 0.9));
		}
		30% {
			opacity: 1;
			color: #34d399;
			transform: translateY(30px) scale(0.9);
			filter: drop-shadow(0 0 2px rgba(52, 211, 153, 0.2));
		}
		38% {
			opacity: 0;
			transform: translateY(30px) scale(0.6);
		}
		90% {
			opacity: 0;
			transform: translateY(0) scale(0.6);
		}
		96% {
			opacity: 1;
			color: var(--color-text-base);
			transform: translateY(0) scale(1);
		}
		100% {
			opacity: 1;
			color: var(--color-text-base);
			transform: translateY(0) scale(1);
		}
	}

	/* 2. Plaintext: Visible (white), slides out to top when key drops, returns at end */
	@keyframes zk-text-plain {
		0% {
			opacity: 1;
			transform: translateY(0);
		}
		22% {
			opacity: 1;
			transform: translateY(0);
		}
		28% {
			opacity: 0;
			transform: translateY(-12px);
		}
		90% {
			opacity: 0;
			transform: translateY(12px);
		}
		96% {
			opacity: 1;
			transform: translateY(0);
		}
		100% {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* 3. Ciphertext: Invisible, appears when key drops (green), stays, disappears when packet departs */
	@keyframes zk-text-cipher {
		0% {
			opacity: 0;
			transform: translateY(12px);
		}
		22% {
			opacity: 0;
			transform: translateY(12px);
		}
		28% {
			opacity: 1;
			transform: translateY(0);
		}
		42% {
			opacity: 1;
			transform: translateY(0);
		}
		48% {
			opacity: 0;
			transform: translateY(-12px);
		}
		100% {
			opacity: 0;
			transform: translateY(12px);
		}
	}

	/* 4. Desktop packet travel: Horizontal from device to server */
	@keyframes zk-packet-travel-desktop {
		0%,
		42% {
			opacity: 0;
			left: 0%;
			transform: translate(-50%, -50%) scale(0.6);
		}
		46% {
			opacity: 1;
			left: 0%;
			transform: translate(-50%, -50%) scale(1);
		}
		75% {
			opacity: 1;
			left: 100%;
			transform: translate(-50%, -50%) scale(1);
		}
		79% {
			opacity: 0;
			left: 100%;
			transform: translate(-50%, -50%) scale(0.6);
		}
		100% {
			opacity: 0;
			left: 0%;
			transform: translate(-50%, -50%) scale(0.6);
		}
	}

	/* 5. Mobile packet travel: Vertical from device to server */
	@keyframes zk-packet-travel-mobile {
		0%,
		42% {
			opacity: 0;
			top: 0%;
			transform: translate(-50%, -50%) scale(0.6);
		}
		46% {
			opacity: 1;
			top: 0%;
			transform: translate(-50%, -50%) scale(1);
		}
		75% {
			opacity: 1;
			top: 100%;
			transform: translate(-50%, -50%) scale(1);
		}
		79% {
			opacity: 0;
			top: 100%;
			transform: translate(-50%, -50%) scale(0.6);
		}
		100% {
			opacity: 0;
			top: 0%;
			transform: translate(-50%, -50%) scale(0.6);
		}
	}

	/* 6. Connector line glow: sweeps from white to green as packet travels */
	@keyframes zk-line-glow {
		0%,
		42% {
			background: var(--color-border-subtle);
			box-shadow: none;
		}
		45% {
			background: rgba(16, 185, 129, 0.25);
		}
		58% {
			background: rgba(16, 185, 129, 0.5);
			box-shadow: 0 0 4px rgba(16, 185, 129, 0.2);
		}
		75% {
			background: rgba(16, 185, 129, 0.25);
		}
		80%,
		100% {
			background: var(--color-border-subtle);
			box-shadow: none;
		}
	}

	/* 7. Shield barrier pulse when packet crosses the middle */
	@keyframes zk-shield-glow {
		0%,
		52% {
			border-color: var(--color-border-subtle);
			background: var(--color-bg-main);
			box-shadow: none;
			transform: scale(1);
			color: var(--color-text-base);
		}
		58% {
			border-color: var(--color-brand-400);
			background: rgba(16, 185, 129, 0.05);
			box-shadow: 0 0 14px rgba(52, 211, 153, 0.6);
			transform: scale(1.15);
			color: var(--color-accent);
		}
		64% {
			border-color: var(--color-border-subtle);
			background: var(--color-bg-main);
			box-shadow: none;
			transform: scale(1);
			color: var(--color-text-base);
		}
		100% {
			border-color: var(--color-border-subtle);
			background: var(--color-bg-main);
			box-shadow: none;
			transform: scale(1);
			color: var(--color-text-base);
		}
	}

	/* 8. Server padlock glow: active/bright green when data is saved, otherwise white */
	@keyframes zk-lock-glow {
		0%,
		73% {
			color: var(--color-text-muted);
			filter: none;
		}
		77%,
		90% {
			color: #10b981;
			filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.7));
		}
		96%,
		100% {
			color: var(--color-text-muted);
			filter: none;
		}
	}

	/* 9. Shackle animation: open, snap shut, stay closed, open again */
	@keyframes zk-shackle-close {
		0%,
		74% {
			transform: translateY(-3px) rotate(-12deg);
		}
		78% {
			transform: translateY(0) rotate(0deg);
		}
		90% {
			transform: translateY(0) rotate(0deg);
		}
		95%,
		100% {
			transform: translateY(-3px) rotate(-12deg);
		}
	}

	/* Responsive styling for the Zero Knowledge simulator */
	@media (max-width: 768px) {
		.zk-flow-animation {
			flex-direction: column;
			gap: 0;
			padding: 32px;
			align-items: center;
		}

		.zk-connector {
			width: 2px;
			height: 100px;
			margin: 12px 0;
			flex-grow: 0;
		}

		.zk-line {
			width: 2px;
			height: 100%;
			left: 50%;
			right: auto;
			transform: translateX(-50%);
			background: var(--color-border-subtle);
			animation: zk-line-glow 6s infinite ease-in-out;
		}

		.zk-packet {
			top: 0%;
			left: 50%;
			transform: translate(-50%, -50%);
			animation: zk-packet-travel-mobile 6s infinite ease-in-out;
		}

		.zk-shield-barrier {
			left: 50%;
			top: 50%;
			transform: translate(-50%, -50%);
			animation: zk-shield-glow 6s infinite ease-in-out;
		}
	}

	.biometric-title-wrapper {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		margin: 0 auto;
	}

	.biometric-title-icon {
		width: 38px;
		height: 38px;
		color: var(--color-accent);
		filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.3));
		flex-shrink: 0;
		transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.biometric-title-icon:hover {
		transform: scale(1.1);
		filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.6));
	}

	.sync-title-wrapper {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		margin: 0 auto;
	}

	.sync-title-icon {
		width: 38px;
		height: 38px;
		color: var(--color-accent);
		filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.3));
		flex-shrink: 0;
		transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.sync-title-icon:hover {
		transform: scale(1.1) rotate(180deg);
		filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.6));
	}

	.read-more-link {
		font-size: 20px;
		color: var(--color-accent);
		text-decoration: none;
		transition:
			color 0.2s ease,
			filter 0.2s ease;
		display: inline-block;
		margin-top: 16px;
	}

	.read-more-link:hover {
		text-decoration: underline;
		filter: brightness(1.1);
	}
</style>
