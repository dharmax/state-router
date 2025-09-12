
## Overview

This package contains a tiny, functional router and a web‑application state manager.

The router captures URL changes and triggers a handler for the first matching route pattern. It supports both hash (`#/path`) and history (`/path`) modes, and passes route parameters and query data to your handler.

The state manager provides a minimal semantic state layer on top of the router: define named states, their route, and optional mode(s); listen for changes; and gate transitions with async guards.

- Static files: the router ignores common static file extensions (e.g. `.css`, `.js`, `.png`, `.svg`, `.webp`, `.json`, `.md`, `.txt`, `.ejs`, `.jsm`). You can customize `router.staticFilters` to adjust.
- Modes: use `router.listen('hash' | 'history')`. For static file serving (file:// or a simple static server), prefer `hash`.

## Installation

Install as usual and build the TypeScript sources:

```
npm install
npm run build
```

## Quick Start

```ts
import { router, StateManager } from '@dharmax/state-router'

// Router: match params and use query context
router
  .add(/^user\/(\d+)$/, function (id: string) {
    // `this` holds query params from the current URL
    // @ts-ignore
    console.log('user', id, 'q=', this.queryParams?.q)
  })
  .listen('hash')

// State Manager: define states and react
const sm = new StateManager('hash')
sm.addState('home', 'home', /^home$/)
sm.addState('post', 'post', /^post\/(\w+)$/)

sm.onChange((event, state) => {
  console.log('state changed to', state.name, 'context=', sm.context)
})

// Navigate
router.navigate('home')
router.navigate('post/hello')
```

## Router API

- `router.add(pattern: RegExp | RouteHandler, handler?: RouteHandler)`
  - If `pattern` is a RegExp, captured groups are passed as handler arguments.
  - If `pattern` is omitted (i.e., you pass only a function), it becomes a catch‑all route.
  - The handler’s `this` contains `queryParams` built from `window.location.search`.

- `router.listen(mode?: 'hash' | 'history')`
  - In `history` mode, internal `<a href="/...">` clicks and Enter on focused links are intercepted.

- `router.navigate(path: string)`
  - Navigates according to the active mode and triggers routing.

- `router.resetRoot(root: string)`
  - Set a base root for history URL calculation.

- `createRouter()`
  - Factory that returns a fresh Router instance. Useful for testing or isolating multiple routers.

## State Manager API

- `new StateManager(mode?: 'hash' | 'history', autostart = true, routerInstance = router)`
  - When `autostart` is true, calls `router.listen(mode)` automatically.
  - You can pass a custom router instance (e.g., from `createRouter()`) for isolation.

- `addState(name, pageName?, route?: RegExp | string, mode?: string | string[])`
  - If `route` is a string and contains `%`, each `%` is expanded to a non‑mandatory capture `?(.*)` for “the rest of the path”. For example, `'docs%'` becomes `^docs?(.*)$` and the first capture is provided as the state context (e.g., `'/guide'`).
  - If `route` is a RegExp, the first capturing group is passed as the state context.

- `setState(name, context?)`
  - Programmatically set the state and optional context (e.g., a sub‑state or id).

- `getState()` / `previous` / `context`
  - Access current, previous state, and the last context value.

- `onChange(handler)`
  - Subscribes to `state:changed` events via `@dharmax/pubsub`.

- `registerChangeAuthority(authority: (target) => Promise<boolean>)`
  - All registered authorities must return `true` to allow a transition.

- `restoreState(defaultState)`
  - Attempts to restore from current URL; otherwise navigates to the default state (hash mode).

- `createStateManager(mode?: 'hash' | 'history', autostart = true, routerInstance = router)`
  - Factory returning a new StateManager; pass a custom router if desired.

## Data, Context, and Parameter Passing

- Route parameters: each capturing group in your route RegExp is passed to the route handler as an argument in order. For `^user\/(\d+)$`, the handler receives the user id string.
- Query params: inside a route handler, `this.queryParams` exposes an object of the URL’s query parameters (e.g., `{ q: 'hello' }`).
- State context: when a route defined via `addState` matches, the first capture group is forwarded to the StateManager as the state “context”. Access it via `stateManager.context` after the transition.

## Examples

```ts
// 1) Params + query
router.add(/^user\/(\d+)$/, function (id) {
  // @ts-ignore
  const { q } = this.queryParams
  console.log('id=', id, 'q=', q)
})

// 2) State context from route
sm.addState('docs', 'docs', 'docs%') // captures the suffix as context, e.g. '/guide'

// 3) Async guard
sm.registerChangeAuthority(async (target) => {
  return target.name !== 'admin-only'
})
```

## Development & Testing

- Build: `npm run build` → compiles TypeScript into `dist/`.
- Manual demo: serve `test/` (e.g., `npx http-server test`) after build. Use `hash` mode for static servers.
- Automated tests: Vitest + jsdom
  - Run once with coverage: `npm test`
  - Watch mode: `npm run test:watch`
  - Notes:
    - Tests use dynamic imports with `vi.resetModules()` to isolate the singleton router/state manager between cases.
    - Some tests mock `URLSearchParams` to simulate query strings in jsdom without full navigation.

## Analytics Hooks

If present, the following globals will be invoked on successful state changes:

- `window.pageChangeHandler('send', 'pageview', '/<state>/<context>')`
- `window.ga('send', 'pageview', '/<state>/<context>')`

These are optional and ignored if missing.
