# Project Rules

* **Context**: This is a refactoring project focused on learning. Proceed slowly and step-by-step.
* **Scope**: Only implement features, refactoring, or additions that are explicitly requested by the user.
* **Confirmations**: 
  * Always ask for confirmation before making major code changes or refactorings.
  * Minor styling tweaks, layout corrections, and small bugs within the requested scope can be applied directly without asking.
  * Always ask for confirmation before running project build commands or terminal scripts (e.g. `npm run build`).
* **UI Styling**: When editing the UI, always use the shared Tailwind theme classes defined in [app.css](file:///C:/Users/Jensk/node-js-projects/login-form/awayinvault-refactor/src/app.css) (such as bg-bg-primary, bg-bg-sidebar, text-text-base, border-border-subtle, etc.) instead of hardcoding specific color values.
* **Navigation & Routing**:
  * **One-Time Use Components**: For components that are built for single/specific use cases (such as the landing page, specific layouts, or dashboard headers), implement routing directly inside the component using SvelteKit's `goto` from `$app/navigation`.
  * **Reusable Components**: For components designed to be reused across different views (such as generic buttons, cards, list items, or forms), do NOT use `goto` internally. Instead, delegate navigation by passing callback functions as props (e.g., using Svelte 5 `$props()` like `onclickLogin` or `onNavigate`) so the parent component controls the routing destination.

