/// <reference types="vitest" />
import adapter from "@sveltejs/adapter-auto";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter(),
		}),
	],
	ssr: {
		noExternal: ["svelte-sonner"],
	},
	test: {
		include: ["src/**/*.{test,spec}.{js,ts}"],
		// Several integration test files share the same live TEST_USER_A/B fixture
		// accounts (vault_items, profiles, teams). Running test files in parallel lets
		// them race on that shared account state (e.g. one test's migration step running
		// concurrently with another test's CLI calls against the same account). Running
		// files sequentially avoids this without needing per-account locking.
		fileParallelism: false,
	},
});
