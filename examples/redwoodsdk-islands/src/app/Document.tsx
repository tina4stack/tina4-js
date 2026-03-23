/**
 * Document shell — the HTML wrapper for all pages.
 *
 * Key integration point: we load tina4-js here as a module script.
 * This gives every page access to tina4-js web components (islands)
 * without shipping React to the browser.
 *
 * tina4-js loads: ~1.5KB gzipped (core: signals + html + component)
 * React would be: ~42KB gzipped (react + react-dom)
 *
 * The page HTML is streamed by RedwoodSDK's RSC pipeline.
 * tina4-js islands hydrate themselves when the browser
 * encounters their custom element tags.
 */

export function Document({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>RedwoodSDK + tina4-js Islands</title>
        <link rel="stylesheet" href="https://unpkg.com/tina4-css@2/dist/tina4.min.css" />

        {/* Load tina4-js islands — these register custom elements */}
        <script type="module" src="/islands/live-stats.js"></script>
        <script type="module" src="/islands/activity-feed.js"></script>
        <script type="module" src="/islands/chat-room.js"></script>
        <script type="module" src="/islands/theme-toggle.js"></script>

        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --bg: #0f1923; --surface: #1a2733; --border: #2a3a4a;
            --text: #e0e8f0; --muted: #8899aa; --accent: #4fc3f7;
            --success: #66bb6a; --danger: #ef5350;
          }
          body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); margin: 0; }
          .container { max-width: 1100px; margin: 0 auto; padding: 2rem; }
          nav { background: var(--surface); border-bottom: 1px solid var(--border); padding: 1rem 2rem; display: flex; gap: 1.5rem; align-items: center; }
          nav a { color: var(--muted); text-decoration: none; font-size: 0.9rem; }
          nav a:hover { color: var(--accent); }
          nav .brand { color: var(--accent); font-weight: 700; font-size: 1.1rem; margin-right: auto; }
          .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 10px; font-size: 0.7rem; font-weight: 600; }
          .badge-rsc { background: rgba(102,187,106,0.15); color: var(--success); }
          .badge-island { background: rgba(79,195,247,0.15); color: var(--accent); }
          h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
          .subtitle { color: var(--muted); margin-bottom: 2rem; }
          .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
          .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; }
          .card h3 { margin-bottom: 0.5rem; }
          .card .desc { color: var(--muted); font-size: 0.9rem; margin-bottom: 1rem; }
          .section { margin-bottom: 2.5rem; }
          .hero { text-align: center; padding: 3rem 1rem; }
          .hero h1 { font-size: 2.5rem; }
          .hero .sizes { display: flex; gap: 2rem; justify-content: center; margin-top: 1.5rem; }
          .hero .size-box { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1rem 1.5rem; }
          .hero .size-box .val { font-size: 1.8rem; font-weight: 700; }
          .hero .size-box .val.accent { color: var(--accent); }
          .hero .size-box .val.muted { color: var(--muted); text-decoration: line-through; }
          .hero .size-box .label { font-size: 0.8rem; color: var(--muted); }
        `}} />
      </head>
      <body>
        <nav>
          <span className="brand">RWSDK + tina4-js</span>
          <a href="/">Home</a>
          <a href="/dashboard">Dashboard</a>
          <a href="/chat">Chat</a>
          <theme-toggle></theme-toggle>
        </nav>
        {children}
      </body>
    </html>
  );
}
