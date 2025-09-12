# Repository Guidelines

## Project Structure & Module Organization
- `src/` — TypeScript sources (`router.ts`, `state-manager.ts`, `index.ts`).
- `dist/` — build output (`index.js`, `.d.ts`). Do not edit.
- `test/` — minimal manual demo (`index.html`) that imports from `dist/`.
- Root files — `package.json`, `tsconfig.json`, `ReadMe.md`.

## Build, Test, and Development Commands
- `npm install` — install dependencies (pnpm supported via `pnpm install`).
- `npm run build` — compile TypeScript to `dist/` via `tsc`.
- `npm test` — not configured; exits non‑zero (see Testing Guidelines).
- Local demo: after build, serve `test/` (e.g., `npx http-server test`), then navigate and click links. For file:// usage, switch router to `'hash'` mode.

## Coding Style & Naming Conventions
- Language: TypeScript (ES2022 target, ES6 modules, strict mode on).
- Indentation: 4 spaces; line length keep reasonable; prefer single quotes.
- Naming: camelCase for variables/functions, PascalCase for classes/types, kebab-case for filenames.
- Types: prefer explicit types on public APIs; keep `strict` happy (nullability handled explicitly since `strictNullChecks` is false).
- No linter configured; match nearby style and keep diffs small.

## Testing Guidelines
- No automated tests yet. Use `test/index.html` for manual verification:
  1) `npm run build`
  2) serve `test/` with a static server and exercise routes.
- If adding tests, colocate under `test/` or `__tests__/` and add an npm script (e.g., Jest or Vitest). Keep fast and deterministic.

## Commit & Pull Request Guidelines
- Commits: concise, imperative, and prefixed when helpful (e.g., `added:`, `fixed:`, `removed:`). Example: `fixed: restoreState for history navigation`.
- PRs: include a clear description, rationale, and before/after notes. Link related issues, add screenshots/GIFs for UX changes, and note any API or README updates.
- CI: ensure `npm run build` succeeds and `dist/` is updated only via the build.

## Security & Configuration Tips
- History mode requires a server that serves app routes (avoid 404s); use hash mode for static file serving.
- Router ignores common static file extensions; adjust `router.staticFilters` if needed.
- Package relies on `@dharmax/pubsub`; keep versions in sync when updating.
