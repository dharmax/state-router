# Project Improvement Plan: state-router

This document serves as a roadmap for evolving the `state-router` library into a more robust, maintainable, and professional-grade tool.

---

## Part 1: Project Critique & Analysis

### 1. Architecture & Coupling
*   **1.1. Hardcoded Side Effects:** The `StateManager` contains hardcoded calls to `window.ga` and `window.pageChangeHandler`. This violates the principle of separation of concerns and forces specific tracking dependencies on the consumer.
*   **1.2. Global PubSub Dependency:** Reliance on a singleton `dispatcher` from `@dharmax/pubsub` creates a hidden global state. This makes testing difficult and prevents running multiple isolated instances of the router/state manager in one environment.
*   **1.3. Router/StateManager Overlap:** There is significant overlap between the two classes. The `StateManager` acts as a wrapper that re-implements some routing logic (like pattern compilation for `%` symbols) rather than fully delegating to the `Router`.

### 2. Reliability & Lifecycle
*   **2.1. Async Race Conditions:** `setState` is asynchronous but lacks a cancellation mechanism. Rapid navigation changes can lead to "out-of-order" state updates where an older request finishes after a newer one.
*   **2.2. Missing "Exit" Lifecycle:** There is no `onExit` or `onLeave` hook. Consumers cannot easily clean up resources (event listeners, timers, DOM elements) when navigating away from a specific state.
*   **2.3. Brittle Internal Navigation:** The global click listener on `document` for `history` mode is aggressive. It may intercept clicks intended for other logic or fail in complex DOM scenarios (e.g., Shadow DOM).
*   **2.4. History State Fragility:** The `popstate` handler expects a specific object structure (`event.state.path`). If the history state is modified by other scripts, the router may break.

### 3. Type Safety & Modern Standards
*   **3.1. Strictness:** `strictNullChecks` is currently disabled in `tsconfig.json`. This hides potential runtime errors related to `null` or `undefined` values.
*   **3.2. Use of `any`:** Extensive use of `any` (especially for `stateContext` and route parameters) negates the benefits of TypeScript.
*   **3.3. Private Fields:** The classes use the TypeScript `private` keyword instead of native ECMAScript private fields (`#`), which provide true runtime encapsulation.

### 4. API & DX (Developer Experience)
*   **4.1. Error Handling:** Using `alert()` for undefined states or `console.warn` for missing routes is intrusive. Libraries should throw Errors or provide configurable logging.
*   **4.2. Incomplete `restoreState`:** The `restoreState` method is documented as only working reliably in `hash` mode, which limits its utility for modern `history` API applications.
*   **4.3. Static File Filtering:** The `staticFilters` list is a manual maintenance burden. A more robust approach would be to let the browser handle anything that doesn't explicitly match a defined route.

---

## Part 2: Action Plan & Decisions

*For each point above, specify the intended resolution (e.g., "Refactor", "Remove", "Keep as is", or a specific implementation detail).*

| ID | Point | Action / Decision                                                     |
| :--- | :--- |:----------------------------------------------------------------------|
| **1.1** | Hardcoded Analytics | keep it                                                               |
| **1.2** | PubSub Dependency | keep it                                                               |
| **1.3** | Router/StateManager Overlap | improve; but there should be a pure router, too. perhaps inner class? |
| **2.1** | Async Race Conditions | yes, improve/fix                                                      |
| **2.2** | Missing "Exit" Lifecycle | yes, improve/fix                                                      |
| **2.3** | Brittle Internal Navigation | fix                                                                   |
| **2.4** | History State Fragility | fix                                                                   |
| **3.1** | Strict Null Checks | ok                                                                    |
| **3.2** | Use of `any` | rethink if changing it doesn't fuck up anything                       |
| **3.3** | Private Fields (#) | ok , change                                                           |
| **4.1** | Error Handling (alert) | ok, improve                                                           |
| **4.2** | restoreState (History mode) | do it                                                                 |
| **4.3** | Static File Filtering | do it                                                                 |
