# AGENTS.md

# RULES
- Never add more code than what i ask - always make sure when i doubt
- always use css classes to style, so the site can benefit from the dark and lightmode
- Rutes that are not /login or /register should be protected in the frontend
- **Navigation & Routing**:
  - Use `goto` from `$app/navigation` directly in the component if it is a single-use component (like landing pages, specific layouts, etc.).
  - Use props (e.g., passing callbacks using Svelte 5 `$props()`) to delegate routing to the parent if the component is designed to be reusable (like generic buttons, cards, forms, etc.).
- **Environment Variables**: Always add any new environment variables introduced in the project to both `.env` and `.env.example` (using placeholder values for the example file).
- **Secrets & Security**: Never commit raw API keys, database passwords, or any sensitive credentials (secrets) to Git. Always keep them in local files like `.env` (which must be gitignored) and document their usage in `.env.example` using dummy/placeholder values.


