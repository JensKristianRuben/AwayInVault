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
* **Environment Variables**: Always add any new environment variables introduced in the project to both `.env` and `.env.example` (using placeholder values for the example file).
* **Secrets & Security**: Never commit raw API keys, database passwords, or any sensitive credentials (secrets) to Git. Always keep them in local files like `.env` (which must be gitignored) and document their usage in `.env.example` using dummy/placeholder values.
* **GitHub Projects & Tasks**:
  * Tasks are tracked using GitHub Projects. When referred to by the user, read the tasks directly from the project boards using the GitHub CLI (`gh`).
  * Useful commands to fetch project and issue information:
    * List projects for an owner (user or organization): `gh project list --owner <owner>`
    * List items in a specific project: `gh project item-list <project-number> --owner <owner>` (optionally add `--format json` for detailed data)
    * View a specific issue's details: `gh issue view <issue-number>`
* **GitHub Issues**: Always write GitHub issues (titles, bodies, and labels) in English.
* **Project Guardrails**: Before concluding any task or marking it as "done", you MUST run the validation checks to prevent regression and ensure code quality:
  * Run the type check: `npm run check`
  * Run the unit/integration tests: `npm run test` (or `npm run test:crypto` if applicable)
  * Run code formatting validation: `npm run format:check`
  You must ensure all checks are 100% green and fix any errors before submitting the work.


