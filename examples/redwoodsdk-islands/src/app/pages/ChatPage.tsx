/**
 * Chat Page — Server layout + tina4-js WebSocket island
 *
 * The page shell is server-rendered.
 * The <chat-room> island connects via tina4-js ws.connect()
 * to a Cloudflare Durable Object for realtime messaging.
 *
 * Traditional approach: ship React + a WebSocket library (~50KB+)
 * Islands approach: ship tina4-js core + ws module (~2.4KB)
 */

export function ChatPage() {
  return (
    <div className="container">
      <h1>Realtime Chat</h1>
      <p className="subtitle">
        tina4-js WebSocket island connected to a Cloudflare Durable Object.
        <br />
        <small style={{ color: "var(--muted)" }}>
          Open this page in two tabs to see realtime sync.
        </small>
      </p>

      <div className="grid">
        {/* Server-rendered explanation */}
        <div className="card">
          <h3>How it works <span className="badge badge-rsc">RSC</span></h3>
          <p className="desc">
            RedwoodSDK renders this page on the server and streams the HTML.
          </p>
          <p className="desc">
            The <code>&lt;chat-room&gt;</code> island loads tina4-js ws module (~0.9KB)
            and connects to a Durable Object via WebSocket.
          </p>
          <p className="desc">
            Messages are piped into a signal. The signal drives the DOM.
            No React. No virtual DOM. Just signals.
          </p>

          <div style={{ marginTop: "1rem", padding: "1rem", background: "var(--bg)", borderRadius: "6px", fontSize: "0.85rem" }}>
            <strong>Data flow:</strong>
            <br />
            <code style={{ color: "var(--accent)" }}>
              Durable Object → WebSocket → ws.pipe(signal) → DOM
            </code>
          </div>
        </div>

        {/* tina4-js WebSocket island */}
        <div>
          {/* @ts-expect-error — custom element */}
          <chat-room
            ws-url="/ws"
            room="lobby"
            style={{ display: "block" }}
          />
        </div>
      </div>
    </div>
  );
}
