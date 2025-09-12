# Changes

Router
- added: `router.unlisten()` to remove listeners (`click`, `keydown`, `popstate`/`hashchange`).
- added: hardened anchor interception in history mode using `closest('a')`; ignores modified/right/middle clicks, `target=_blank`, `download`, `rel=noreferrer`, external origins/different hosts; skips static‑looking URLs.
- added: 404 fallback via `router.onNotFound(handler)` when no routes match.
- added: named param string patterns (e.g. `'/users/:id'`) with `this.params` passed to handlers.
- added: `router.getQueryParams()` helper for convenient query parsing.
- added: optional decoding of params via `router.setDecodeParams(true|false)`.
- improved: SSR‑safety by lazy access to `window`/`document` and no‑ops outside the browser.
- docs: `router.resetRoot()` documented explicitly.
- note: `router.replace()` intentionally not added (see request).

StateManager
- fixed: typing — internal `stateContext` and `context` getter are `any`.
- added: factory‑centered DX (constructor already supported injection); tests use `createRouter`/`createStateManager`.
- added: `onBeforeChange` (with veto) and `onAfterChange` hooks; `onNotFound` proxies to router.
- added: multi‑capture context — if a route has multiple captures, passes an array; if named params, passes an object.
- added: `sm.stop()` to unlisten the injected router.

DX/Docs/Tests
- updated: tests use factories (no dynamic module resets), cover named params, notFound, unlisten, query helper, and multi‑capture context.
- updated: README with new APIs, SSR notes, and interception behavior in history mode.
