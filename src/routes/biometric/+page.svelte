<script lang="ts">
	import { goto } from "$app/navigation";
	import TopicPage from "$lib/components/TopicPage.svelte";

	const paragraphs = [
		"Biometric login allows you to unlock your vault instantly using your device's fingerprint scanner or facial recognition (Windows Hello, TouchID, FaceID). It's fast, secure, and feels a bit like sci-fi.",
		"Under the hood, we use the WebAuthn API with PRF (Pseudo-Random Function) extension. When you touch the sensor, your device derives a unique credential key locally. We combine this key with your salt to decrypt your vault.",
		"Honestly, we don't store your fingerprints or face scans—and neither does Supabase. The biometric verification is handled entirely by your operating system, keeping your raw biometric data safe and private.",
	];
</script>

<svelte:head>
	<title>Biometric Login - AwayInVault</title>
</svelte:head>

<TopicPage title="Biometric Login" {paragraphs} onBack={() => goto("/")} />
