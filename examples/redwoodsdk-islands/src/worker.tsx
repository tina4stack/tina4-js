/**
 * RedwoodSDK + tina4-js Islands
 *
 * Server renders pages with React Server Components.
 * Interactive islands use tina4-js web components (1.5KB)
 * instead of React client components (42KB).
 *
 * The best of both worlds:
 *   - Server: React RSC for data fetching, streaming, SEO
 *   - Client: tina4-js for reactivity without shipping React to the browser
 */

import { env } from "cloudflare:workers";
import { defineApp, route, prefix, render } from "rwsdk/worker";
import { SyncedStateServer, syncedStateRoutes } from "rwsdk/use-synced-state/worker";
import { Document } from "./app/Document";
import { HomePage } from "./app/pages/HomePage";
import { DashboardPage } from "./app/pages/DashboardPage";
import { ChatPage } from "./app/pages/ChatPage";

// Re-export Durable Object for realtime
export { SyncedStateServer };

export default defineApp([
  // Realtime WebSocket routes (for tina4-js ws.connect)
  ...syncedStateRoutes(() => env.SYNCED_STATE_SERVER),

  // Application routes — all server-rendered
  render(Document, [
    route("/", () => <HomePage />),
    route("/dashboard", () => <DashboardPage />),
    route("/chat", () => <ChatPage />),
  ]),
]);
