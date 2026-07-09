<script lang="ts">
	import { goto } from "$app/navigation";
	import TopicPage from "$lib/components/TopicPage.svelte";

	const paragraphs = [
		"The World Wide Web (WWW) is basically a massive, global network of servers talking to each other using standardized languages and protocols. It's the ultimate open highway.",
		"When you sync your data in aiv, we don't spin up a secret telepathic link between your laptop and your phone. We just use standard HTTP requests to store your securely encrypted credentials in the cloud database.",
		"Because the web is open and unified, any of your authorized devices can fetch those encrypted payloads from anywhere on Earth. We didn't build the internet - we just use its beautiful architecture to keep your passwords secure and accessible.",
	];
</script>

<svelte:head>
	<title>How the WWW Works - AwayInVault</title>
</svelte:head>

<TopicPage title="How the WWW Works" {paragraphs} onBack={() => goto("/")} />
