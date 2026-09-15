# Specification: Init App Architecture

## Requirements
1. **Design Tokens (`src/css/tokens/`)**:
   - `colors.css`: Semantic brand, neutral, status, and theme palette (light & dark mode).
   - `typography.css`: Font families, font sizes, line heights, font weights.
   - `spacing.css`: Standard 4px-based grid spacing system, border radii, transitions, elevations.
   - `index.css`: Central aggregator exposing tokens to `:root` and Tailwind `@theme`.

2. **Atomic Structure**:
   - Atoms: Minimal building blocks (`button`, `input`, `badge`).
   - Molecules: Combinations (`search-field`, `metric-card`).
   - Organisms: Distinct UI sections (`header`, `hero-section`).
   - Templates/Pages: `index.html`.

3. **Tailwind CSS v4 Integration**:
   - Use `@import "tailwindcss";` in `src/css/main.css`.
   - Map custom tokens in `@theme` block to generate utility classes seamlessly.

4. **Vanilla JavaScript Modularization**:
   - ES Modules loaded with `<script type="module" src="/src/js/main.js">`.
   - Small, decoupled modules for interactive behaviors (e.g. search filter, theme toggle, interactive ripples).
