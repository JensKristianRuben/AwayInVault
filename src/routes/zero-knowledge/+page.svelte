<script lang="ts">
	import { goto } from "$app/navigation";
	import TopicPage from "$lib/components/TopicPage.svelte";

	const paragraphs = [
		"Zero-Knowledge means that you are the only person on Earth who holds the keys to your data. We know absolutely nothing about what you store in your vault.",
		"Before your passwords or notes ever leave your browser, they are encrypted locally on your device using AES-GCM. We never transmit your master password, and we never store your private keys on our servers.",
		"This means that even if our databases were breached, your data would remain completely unreadable—just a wall of scrambled gibberish. If you lose your master password, we can't recover it for you. That is the price of true security.",
	];
</script>

<svelte:head>
	<title>Zero-Knowledge - AwayInVault</title>
</svelte:head>

<TopicPage title="Zero-Knowledge" {paragraphs} onBack={() => goto("/")} />
