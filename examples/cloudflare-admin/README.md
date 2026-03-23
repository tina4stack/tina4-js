# Cloudflare Workers + tina4-js Admin Dashboard

A complete admin dashboard running on Cloudflare Workers with D1 database.
Demonstrates how tina4-js's 1.5KB core replaces React's 42KB runtime on the edge.

## Architecture

```
Cloudflare Worker (edge)
  |-- serves static HTML + tina4-js bundle (< 5KB total)
  |-- REST API endpoints (/api/users, /api/stats)
  |-- D1 SQLite database
  |-- tina4-js frontend (signals, components, routing, API client)
```

## Why tina4-js on Cloudflare?

- **Workers have size limits** (1MB free, 10MB paid) -- every KB matters
- **Cold start** -- smaller bundles = faster edge startup
- **No build step** -- self-contained HTML + JS, no SSR needed
- **Web Components** -- native browser support, no framework runtime

## Size comparison on the edge

| Stack | Gzipped JS | Cold Start |
|-------|-----------|------------|
| React + React DOM | ~42 KB | ~50ms |
| Vue 3 | ~33 KB | ~40ms |
| Preact | ~4 KB | ~15ms |
| **tina4-js (core)** | **~1.5 KB** | **~5ms** |

## Setup

```bash
# Install wrangler
npm install -g wrangler

# Clone and enter
cd examples/cloudflare-admin

# Create D1 database
wrangler d1 create tina4-admin-db

# Update wrangler.toml with your database_id

# Run locally
wrangler dev

# Deploy
wrangler deploy
```

## Files

```
worker.js          -- Cloudflare Worker (API + static serving)
index.html         -- Admin dashboard (tina4-js frontend)
schema.sql         -- D1 database schema
wrangler.toml      -- Cloudflare config
```
