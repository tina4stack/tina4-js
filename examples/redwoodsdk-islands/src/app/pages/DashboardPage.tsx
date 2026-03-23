/**
 * Dashboard Page — Server Component with tina4-js islands
 *
 * Layout and static content: server-rendered (zero JS)
 * Interactive widgets: tina4-js islands (1.5KB)
 *
 * Compare this to a typical React dashboard where the ENTIRE page
 * ships as a client component (42KB React + your code).
 * Here, only the interactive parts need JavaScript.
 */

export function DashboardPage() {
  // This runs on the server — could fetch from D1, KV, etc.
  const serverTime = new Date().toISOString();

  return (
    <div className="container">
      <h1>Dashboard</h1>
      <p className="subtitle">
        Layout is server-rendered. KPI cards and feed are tina4-js islands.
        <br />
        <small style={{ color: "var(--muted)" }}>
          Server time: {serverTime} <span className="badge badge-rsc">RSC</span>
        </small>
      </p>

      {/* Static server content — no JS */}
      <div className="section">
        <div className="grid">
          <div className="card">
            <h3>Server Info <span className="badge badge-rsc">RSC</span></h3>
            <p className="desc">
              This card was rendered on the Cloudflare edge. The server time above
              proves it — refresh the page and it changes. No client JS involved.
            </p>
          </div>
          <div className="card">
            <h3>Why islands?</h3>
            <p className="desc">
              A full React dashboard ships ~50KB+ to the browser.
              With islands, only the interactive KPI cards and activity feed need JS.
              Everything else is streamed HTML.
            </p>
          </div>
        </div>
      </div>

      {/* tina4-js islands — these are the only JS on the page */}
      <div className="section">
        <h2 style={{ marginBottom: "1rem" }}>
          Live KPIs <span className="badge badge-island">tina4-js</span>
        </h2>
        {/* @ts-expect-error — custom elements */}
        <live-stats
          endpoint="/api/stats"
          refresh="5000"
          columns="4"
        />
      </div>

      <div className="section">
        <h2 style={{ marginBottom: "1rem" }}>
          Activity Feed <span className="badge badge-island">tina4-js</span>
        </h2>
        {/* @ts-expect-error — custom elements */}
        <activity-feed max="10" />
      </div>
    </div>
  );
}
