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
		// Ryd eksisterende timer for at undgå dobbelte cyklusser
		if (cycleTimer) {
			clearTimeout(cycleTimer);
			cycleTimer = null;
		}

		// Timeren skal kun køre i mobil-visning
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
				// Hvis vi skifter til mobil, eller timeren ikke kører, starter vi cyklussen
				if (!wasMobile || !cycleTimer) {
					simMode = defaultMode;
					runCycle();
				}
			} else {
				// På desktop/laptop fjerner vi timeren og nulstiller til standard flocking
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
		<!-- Blød grøn glød centreret bag logoet -->
		<div class="logo-glow"></div>

		<!-- Partikelsimulationen i baggrunden (med tovejs-binding) -->
		<BoidsSimulation mode={simMode} bind:textAssembled={assemblyComplete} {logoElement} />

		<!-- Diskret, professionel notifikation i toppen -->
		{#if showAlert}
			<div class="toast-notification" transition:fly={{ y: -30, duration: 300 }}>
				<div class="toast-content">
					<span class="toast-dot"></span>
					<p class="toast-message">{alertText}</p>
				</div>
			</div>
		{/if}

		<!-- Centreret, ultra-minimalistisk UI Overlay -->
		<div class="ui-overlay">
			<div class="center-content" in:fade={{ duration: 400, delay: 200 }}>
				<!-- Større, centreret brand logo -->
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
						Log ind
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
						Opret konto
					</button>
				</div>
			</div>
		</div>

		<!-- Diskret pil der peger nedad for at indikere mere indhold -->
		<button
			class="scroll-indicator"
			onclick={scrollToContent}
			aria-label="Rul ned for at læse mere"
			transition:fade={{ duration: 300, delay: 600 }}
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
					Dine data krypteres på din enhed, før de overhovedet forlader browseren. Vi kender aldrig
					din hovedadgangskode.
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

					<!-- Hovednøgle (Krypterer kun lokalt, sendes ikke) -->
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

				<!-- Sikker Forbindelseslinje -->
				<div class="zk-connector">
					<div class="zk-line"></div>
					<div class="zk-packet">
						<!-- Krypteret datapakke symbol -->
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

					<!-- Sikkerhedsskjold som barriere i midten -->
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

				<!-- Node 2: Krypteret Server Sky -->
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

					<!-- Database Hængelås -->
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

	<!-- Biometrisk Login Sektion (Full View) -->
	<section class="feature-page biometric-section">
		<div class="container page-container">
			<h2 class="page-title">Biometrisk login</h2>
			<p class="page-subtitle">
				Hurtig og sikker adgang med Windows Hello, FaceID eller fingeraftryk direkte fra alle dine
				enheder.
			</p>
		</div>
	</section>

	<!-- Auto-synkronisering Sektion (Full View) -->
	<section class="feature-page sync-section">
		<div class="container page-container">
			<h2 class="page-title">Auto-synkronisering</h2>
			<p class="page-subtitle">
				Gem en adgangskode ét sted, og få den synkroniseret øjeblikkeligt til alle dine enheder
				under fuld kryptering.
			</p>
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
		opacity: 0.045; /* Meget svag og professionel glød */
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
		pointer-events: none; /* Lad musen gå igennem til partiklerne */
		padding: 24px;
		box-sizing: border-box;
	}

	/* Indhold placeret centralt men trukket en smule op */
	.center-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		pointer-events: auto; /* Aktivér klik på elementer */
		transform: translateY(
			-8vh
		); /* Trækker elementerne op for at give plads til formationer i bunden/midten */
	}

	.brand-logo {
		font-size: 40px; /* Større brand overskrift */
		font-weight: 700;
		letter-spacing: 6px;
		color: #ffffff;
		margin: 0 0 28px 0;
		transition:
			color 0.5s ease,
			opacity 0.5s ease;
		background: linear-gradient(to right, #ffffff, #ffffff);
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
		background: rgba(255, 255, 255, 0.03);
		color: #ffffff;
		border: 1px solid rgba(255, 255, 255, 0.12);
	}

	.btn-secondary:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.25);
		transform: translateY(-1px);
	}

	/* Rulle-indikator (pil ned) */
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
		color: #ffffff;
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
		background: rgba(20, 26, 23, 0.85);
		border: 1px solid rgba(16, 185, 129, 0.4);
		border-radius: 6px;
		padding: 8px 18px;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.55);
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
		color: #ffffff;
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
		background: linear-gradient(135deg, #ffffff 0%, #a7f3d0 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.page-subtitle {
		font-size: 17px;
		color: #9ca3af;
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
		color: #d1d5db;
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
		color: #ffffff;
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
		background: rgba(255, 255, 255, 0.1);
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
		border: 1px solid rgba(255, 255, 255, 0.15);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		box-sizing: border-box;
		animation: zk-shield-glow 6s infinite ease-in-out;
		color: #ffffff;
	}

	.barrier-icon {
		width: 14px;
		height: 14px;
		color: inherit;
		filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.15));
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
		color: #d1d5db;
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
			color: #d1d5db;
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
			color: #d1d5db;
			filter: none;
		}
		77%,
		90% {
			color: #10b981;
			filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.3));
		}
		96%,
		100% {
			color: #d1d5db;
			filter: none;
		}
	}

	/* 1. Key animation: Float (white), drop to encrypt (green), pulse, disappear, return */
	@keyframes zk-key-pulse-drop {
		0% {
			opacity: 1;
			color: #ffffff;
			filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.15));
			transform: translateY(0) scale(1);
		}
		18% {
			opacity: 1;
			color: #ffffff;
			filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.15));
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
			color: #ffffff;
			filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.15));
			transform: translateY(0) scale(1);
		}
		100% {
			opacity: 1;
			color: #ffffff;
			filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.15));
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
			background: rgba(255, 255, 255, 0.1);
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
			background: rgba(255, 255, 255, 0.1);
			box-shadow: none;
		}
	}

	/* 7. Shield barrier pulse when packet crosses the middle */
	@keyframes zk-shield-glow {
		0%,
		52% {
			border-color: rgba(255, 255, 255, 0.15);
			background: var(--color-bg-main);
			box-shadow: none;
			transform: scale(1);
			color: #ffffff;
		}
		58% {
			border-color: var(--color-brand-400);
			background: rgba(16, 185, 129, 0.05);
			box-shadow: 0 0 14px rgba(52, 211, 153, 0.6);
			transform: scale(1.15);
			color: var(--color-accent);
		}
		64% {
			border-color: rgba(255, 255, 255, 0.15);
			background: var(--color-bg-main);
			box-shadow: none;
			transform: scale(1);
			color: #ffffff;
		}
		100% {
			border-color: rgba(255, 255, 255, 0.15);
			background: var(--color-bg-main);
			box-shadow: none;
			transform: scale(1);
			color: #ffffff;
		}
	}

	/* 8. Server padlock glow: active/bright green when data is saved, otherwise white */
	@keyframes zk-lock-glow {
		0%,
		73% {
			color: #d1d5db;
			filter: none;
		}
		77%,
		90% {
			color: #10b981;
			filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.7));
		}
		96%,
		100% {
			color: #d1d5db;
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
			background: rgba(255, 255, 255, 0.1);
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
</style>
