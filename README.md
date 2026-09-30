# HawkVision Wallboard

Read-only, full-screen (1920×1080, dark) wallboard. React 18 + TypeScript (strict) + Vite + Recharts + Zod.

## Run
```bash
npm install && npm run dev      # web on :5173, mock API on :3001 (concurrently)
```
Open http://localhost:5173, then edit `data/dashboard.json` and save. Poll interval: `VITE_POLL_MS` (default 5000).

### Optional: auto-simulate live data (no manual edits)
For a demo, run this in a second terminal instead of hand-editing the JSON:
```bash
npm run simulate
```
It mutates `data/dashboard.json` every 4s — nudges a KPI, adds a random incident, flips a camera online/offline, or wobbles CPU/GPU/memory — so the wallboard updates itself live. Stop it with Ctrl+C at any time; `data/dashboard.json` stays wherever it last left off, and you can go back to editing it by hand.

## Update strategy: polling (Option A)
The mock server (`server/server.mjs`, plain Node, no deps) returns the raw file on each request; the client polls every 5 s.
- **Why:** the JSON is re-read on every request, so even a malformed file reaches the client and is handled there – exactly the "missing comma" test. Reconnection is free (the next tick is the retry), and nothing holds a connection open.
- **Trade-offs:** latency up to one interval (WebSocket would be near-instant); load grows linearly with wallboards × 1/interval (fine for a control room; for hundreds of screens add ETag/304 or move to WebSocket/SSE with server-side fan-out); much simpler than sockets + backoff.
- **No needless re-renders:** each section is compared (JSON) with the previous one and the old reference is kept if unchanged, so unchanged charts do not re-render.

## Deployed link for demo

https://hawkvision-wallboard.vercel.app
 

## Behaviours
KPI tile flashes ~1 s on value change; a *new* critical incident is highlighted in the ticker and pulses the Critical Alerts tile; offline cameras are grey/dashed/struck-through in the FPS legend. Use cases with 0 are hidden and the rest sorted.

## Charts: Recharts
Declarative React components, built-in `ReferenceLine` (dashed thresholds), legend formatter (strike-through offline cameras), animated transitions, small API surface. Trade-off: less performant than ECharts for huge datasets, irrelevant here.

## Structure
```
data/dashboard.json     file to edit
server/server.mjs       mock API
src/schema.ts           Zod schemas + inferred types
src/useDashboard.ts     polling + per-section validation
src/hooks.ts            flash / fresh-id / clock hooks
src/Widget.tsx          reusable panel wrapper (title, error, empty state)
src/widgets.tsx         KPI tile, charts, ticker
src/App.tsx, styles.css layout (CSS grid)
```

## Assumptions
- "Cameras Online" starts from the JSON KPI (14/18). Cameras that go offline in `cameraFps` after first load are subtracted from it (the feed only lists 5 of 18 cameras).
- "Last update" is the time of the last successful poll (`meta.updatedAt` is validated but not displayed).
- Ticker scrolls only when more than 5 incidents; new incidents are highlighted for 8 s.

## With more time
WebSocket/SSE option with backoff, ETag/304 polling, Vitest tests for the transforms, config-driven layout, auto-rotating pages, Dockerfile, deployed link.
