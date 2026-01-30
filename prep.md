# Vite + React Interview Prep (2 Hours)

This guide is tied to the current codebase under `web/`.

## 0) Map the boot path (5-10 min)
Start with `web/package.json` to understand the dev entry point and tooling.

- `npm run dev` runs Vite's dev server, which serves files and transforms modules on the fly.
- `web/index.html` includes a module script that imports `/src/main.tsx`, which becomes the runtime entry point.

## 1) Vite entry: `main.tsx` (15-20 min)
Read `web/src/main.tsx` end-to-end. Focus on the render tree:

- `initSentry()` sets up observability (errors and traces) before any UI renders.
- `createRoot(...).render(...)` mounts React onto the `#root` DOM node.
- `StrictMode` adds dev-only checks and highlights unsafe side effects.
- `Provider` makes the Redux store available to all components.
- `BrowserRouter` listens to URL changes and swaps route components.
- `App` is the top-level layout and routing component.

## 2) StrictMode (5-10 min)
What to know for interviews:

- Development-only wrapper that enables extra checks and warnings.
- Double-invokes renders and some effects in dev to surface side effects.
- Does not change production behavior.

## 3) react-redux vs React Context (15-20 min)
The app uses Redux via `Provider` and a store from `web/src/store/index.ts`.

React Context:
- Best for low-frequency, global values (theme, locale, auth metadata).
- Can cause broad re-renders if overused or poorly memoized.
- Minimal tooling for complex state.

Redux (react-redux + Redux Toolkit):
- Centralized state with structured updates and predictable data flow.
- Good for complex, shared, frequently changing data.
- Strong tooling: devtools, middleware, async flows.

Rule of thumb:
- Use Context for simple cross-cutting concerns.
- Use Redux for complex or highly shared state.

## 4) BrowserRouter (10-15 min)
`BrowserRouter` uses the HTML5 History API to keep URL and UI in sync.

- Client-side route changes do not reload the page.
- URL changes select which component renders in `Routes`.

## 5) App as main component (10-15 min)
Read `web/src/App.tsx`:

- Provides the layout shell (navigation + main content area).
- Defines routes in `Routes` / `Route` to map URLs to pages.
- Keeps `Navigation` outside routes so it is always visible.

## 6) ErrorBoundary, Navigation, Routes (20-25 min)
From `web/src/App.tsx`:

- `ErrorBoundary` catches render-time errors and shows fallback UI.
- `Navigation` is a top-level nav shown on all pages.
- `Routes` selects one route based on the current URL.

Current routes:
- `/` -> `RewardsList`
- `/redemptions` -> `RedemptionHistory`

## 2-Hour Plan (order to follow)
1. `web/package.json` -> scripts and entry (10 min)
2. `web/src/main.tsx` -> render tree (20 min)
3. `StrictMode`, `Provider`, `BrowserRouter` -> why each exists (20 min)
4. `web/src/App.tsx` -> layout + routes (20 min)
5. `ErrorBoundary` + `Navigation` components (20 min)
6. `RewardsList` + `RedemptionHistory` high-level flow (30 min)

## Quick Interview One-Liners
- "Vite serves `index.html` and loads `src/main.tsx` as the React entry."
- "StrictMode is dev-only and helps detect unsafe side effects."
- "Context is for simple globals; Redux for complex, shared state with tooling."
- "BrowserRouter uses the History API for client-side routing."
- "App is the main layout shell and routing hub."
