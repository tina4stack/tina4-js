# RedwoodSDK + tina4-js Islands

Islands architecture for Cloudflare: server-render with RedwoodSDK, hydrate interactive widgets with tina4-js.

## The Problem

RedwoodSDK uses React Server Components to stream HTML from the edge. When you need interactivity, you add `"use client"` — which ships React + ReactDOM (42KB) to the browser. For a dashboard with a few live widgets, that's a heavy price.

## The Solution

Replace React client components with **tina4-js Web Components** (1.5KB). The server still renders everything with RSC. But interactive "islands" are native custom elements powered by tina4-js signals — no React runtime on the client.

```
Server (RedwoodSDK + RSC)         Client (browser)
┌─────────────────────┐           ┌──────────────────────┐
│ Stream HTML          │──────────│ Static HTML (0 KB JS) │
│ Data fetching        │           │                      │
│ SEO, layout          │           │ <live-stats>  (0.8KB)│
│ Auth middleware       │           │ <chat-room>   (1.2KB)│
│ D1/KV/R2 access      │           │ <theme-toggle>(0.3KB)│
└─────────────────────┘           └──────────────────────┘
                                    Total JS: ~2.3 KB
                                    vs React: ~42+ KB
```

## Islands

| Component | What it does | Size | tina4-js features |
|-----------|-------------|------|-------------------|
| `<live-stats>` | Polls API, displays KPI cards | ~0.8KB | signal, effect, Tina4Element |
| `<activity-feed>` | Live activity log with badges | ~0.6KB | signal, computed, Tina4Element |
| `<chat-room>` | WebSocket chat via Durable Objects | ~1.2KB | signal, ws, Tina4Element |
| `<theme-toggle>` | Dark/light mode toggle | ~0.3KB | signal, effect |

## Project Structure

```
src/
  worker.tsx              -- RedwoodSDK app (defineApp, routes, RSC)
  app/
    Document.tsx          -- HTML shell (loads island scripts)
    pages/
      HomePage.tsx        -- RSC page with <live-stats> + <activity-feed> islands
      DashboardPage.tsx   -- RSC page with KPI islands
      ChatPage.tsx        -- RSC page with <chat-room> WebSocket island

public/
  islands/
    live-stats.js         -- tina4-js Tina4Element (polls /api/stats)
    activity-feed.js      -- tina4-js Tina4Element (polls /api/activity)
    chat-room.js          -- tina4-js Tina4Element (WebSocket + Durable Objects)
    theme-toggle.js       -- tina4-js Tina4Element (CSS var toggle)

wrangler.jsonc            -- Cloudflare config + Durable Object binding
```

## How It Works

1. **RedwoodSDK renders the page** on the Cloudflare edge using React Server Components
2. **HTML streams to the browser** — text, layout, cards are all server-rendered (zero JS)
3. **Browser encounters `<live-stats>`** — a custom element it doesn't know yet
4. **Island script loads** (0.8KB) — registers the custom element with `customElements.define()`
5. **tina4-js signals power the island** — polling, state, DOM updates. No React.

## Setup

```bash
cd examples/redwoodsdk-islands
npm install
npm run dev     # starts local Cloudflare dev server
```

## Deploy

```bash
npm run deploy  # deploys to Cloudflare Workers
```

## When to Use This Pattern

Use islands when:
- Most of your page is static/server-rendered
- You have a few interactive widgets (dashboards, feeds, toggles)
- Bundle size matters (Cloudflare Workers, mobile, slow networks)
- You want Web Components that work in any framework

Don't use islands when:
- Your entire page is highly interactive (SPA)
- You need React's component ecosystem (forms, charts, UI libraries)
- Your team is already invested in React client components
