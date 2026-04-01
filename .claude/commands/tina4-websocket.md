# Set Up tina4-js WebSocket

Create a WebSocket connection for `$ARGUMENTS` (or ask the user for the WebSocket path).

## Instructions

1. Connect to the WebSocket endpoint
2. Set up message handlers
3. Use signals for reactive state
4. Handle connection status

## Template

```javascript
import { signal, html, ws, effect } from "tina4-js";

// Connect
const socket = ws.connect("ws://localhost:7145/ws/chat/room1", {
    reconnect: true,
    reconnectDelay: 3000,
});

// Reactive connection status
effect(() => {
    console.log("WebSocket status:", socket.status.value);
    // "connecting" | "connected" | "disconnected" | "reconnecting"
});

// Message handling
const messages = signal([]);

socket.on("message", (data) => {
    messages.value = [...messages.value, data];
});

// Pipe messages directly into a signal
socket.pipe(messages, (msg, current) => [...current, msg]);

// Send
function sendMessage(text) {
    socket.send({ type: "chat", text });  // Objects auto-serialized to JSON
}

// UI
const template = html`
    <div>
        <p>Status: ${socket.status}</p>

        <ul>
            ${() => messages.value.map(msg => html`
                <li>${msg.text || msg}</li>
            `)}
        </ul>

        <input @keydown=${(e) => {
            if (e.key === "Enter") {
                sendMessage(e.target.value);
                e.target.value = "";
            }
        }}>
    </div>
`;
```

## Key Rules

- `ws.connect(url, options?)` — NOT `ws(url)` or `new WebSocket(url)`
- Returns a `ManagedSocket` with reactive signals
- `socket.status` is a signal — use `${socket.status}` in templates
- `socket.send(data)` — objects auto-serialized to JSON
- `socket.on("message", handler)` — for incoming messages
- `socket.pipe(signal, reducer)` — pipe messages into a signal
- Auto-reconnects by default
- Close: `socket.close()`
