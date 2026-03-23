/**
 * Home Page — Server Component (zero JS shipped)
 *
 * This entire page is rendered on the server by RedwoodSDK.
 * No React runtime is sent to the browser.
 * The only client JS comes from tina4-js islands.
 */

export function HomePage() {
  return (
    <div className="container">
      <div className="hero">
        <h1>Islands Architecture</h1>
        <p className="subtitle">
          Server-rendered by RedwoodSDK. Interactive islands powered by tina4-js.
        </p>
        <div className="sizes">
          <div className="size-box">
            <div className="val muted">42 KB</div>
            <div className="label">React client bundle</div>
          </div>
          <div className="size-box">
            <div className="val accent">1.5 KB</div>
            <div className="label">tina4-js islands</div>
          </div>
        </div>
      </div>

      <div className="section">
        <h2 style={{ marginBottom: "1rem" }}>How it works</h2>
        <div className="grid">
          <div className="card">
            <h3>1. Server renders HTML <span className="badge badge-rsc">RSC</span></h3>
            <p className="desc">
              RedwoodSDK streams server-rendered HTML. Data fetching, SEO, layout — all on the server.
              Zero JavaScript for static content.
            </p>
          </div>
          <div className="card">
            <h3>2. Islands hydrate <span className="badge badge-island">tina4-js</span></h3>
            <p className="desc">
              Interactive widgets are tina4-js Web Components. The browser sees a custom element tag,
              loads the island script, and it self-hydrates. No React runtime needed.
            </p>
          </div>
          <div className="card">
            <h3>3. Signals drive reactivity</h3>
            <p className="desc">
              Each island uses tina4-js signals for state. Updates are surgical — no virtual DOM diffing,
              no reconciliation. Just direct DOM updates when a signal changes.
            </p>
          </div>
        </div>
      </div>

      {/* This section is 100% server-rendered — zero JS */}
      <div className="section">
        <h2 style={{ marginBottom: "1rem" }}>
          This text is server-rendered <span className="badge badge-rsc">RSC</span>
        </h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Everything you see here was streamed as HTML by RedwoodSDK on the edge.
          View source — it's real HTML, not a React hydration payload.
          The only JavaScript on this page is the tina4-js islands below.
        </p>
      </div>

      {/* These are tina4-js islands — self-contained, reactive, ~1.5KB total */}
      <div className="section">
        <h2 style={{ marginBottom: "1rem" }}>
          Live islands <span className="badge badge-island">tina4-js</span>
        </h2>
        <div className="grid">
          {/* @ts-expect-error — custom elements */}
          <live-stats
            endpoint="/api/stats"
            refresh="3000"
          />
          {/* @ts-expect-error — custom elements */}
          <activity-feed max="5" />
        </div>
      </div>
    </div>
  );
}
