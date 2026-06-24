# AGENTS.md

# RULES
- Never add more code than what i ask - always make sure when i doubt
- always use css classes to style, so the site can benefit from the dark and lightmode
- Rutes that are not /login or /register should be protected in the frontend
- **Navigation & Routing**:
  - Use `goto` from `$app/navigation` directly in the component if it is a single-use component (like landing pages, specific layouts, etc.).
  - Use props (e.g., passing callbacks using Svelte 5 `$props()`) to delegate routing to the parent if the component is designed to be reusable (like generic buttons, cards, forms, etc.).


