/**
 * <chat-room> — tina4-js WebSocket island for RedwoodSDK
 *
 * Connects to a Cloudflare Durable Object via WebSocket.
 * Uses tina4-js ws.connect() with auto-reconnect and signal piping.
 *
 * Usage in RSC:
 *   <chat-room ws-url="/ws" room="lobby" />
 *
 * Data flow:
 *   Durable Object → WebSocket → ws.pipe(messages, append) → DOM
 *
 * Size: ~1.2KB (core + ws module)
 */

import { signal, effect, html, Tina4Element } from 'https://unpkg.com/tina4js@1/dist/core.es.js';

class ChatRoom extends Tina4Element {
  static props = {
    'ws-url': String,
    room: String,
  };
  static shadow = true;

  static styles = `
    :host { display: block; background: #1a2733; border: 1px solid #2a3a4a; border-radius: 8px; overflow: hidden; }
    .header { padding: 0.8rem 1rem; background: rgba(79,195,247,0.08); border-bottom: 1px solid #2a3a4a; display: flex; justify-content: space-between; align-items: center; }
    .header h3 { font-size: 1rem; margin: 0; color: #e0e8f0; }
    .status { font-size: 0.8rem; }
    .status.connected { color: #66bb6a; }
    .status.connecting { color: #ffa726; }
    .status.disconnected { color: #ef5350; }
    .messages { padding: 1rem; height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; }
    .msg { font-size: 0.9rem; color: #e0e8f0; }
    .msg .author { color: #4fc3f7; font-weight: 600; }
    .msg .time { color: #8899aa; font-size: 0.75rem; margin-left: 0.5rem; }
    .msg.system { color: #8899aa; font-style: italic; }
    .input-bar { display: flex; border-top: 1px solid #2a3a4a; }
    .input-bar input { flex: 1; background: #0f1923; border: none; color: #e0e8f0; padding: 0.8rem 1rem; font-size: 0.9rem; outline: none; }
    .input-bar button { background: #4fc3f7; color: #000; border: none; padding: 0.8rem 1.2rem; font-weight: 600; cursor: pointer; }
    .input-bar button:hover { background: #81d4fa; }
    .input-bar button:disabled { opacity: 0.5; cursor: not-allowed; }
  `;

  messages = signal([]);
  status = signal('disconnected');
  inputText = signal('');
  username = signal('User-' + Math.random().toString(36).slice(2, 6));
  socket = null;

  connectedCallback() {
    super.connectedCallback();
    this._connect();
  }

  disconnectedCallback() {
    if (this.socket) this.socket.close();
  }

  _connect() {
    const wsUrl = this.prop('ws-url') || '/ws';
    const room = this.prop('room') || 'lobby';
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}${wsUrl}?room=${room}`;

    this.status.value = 'connecting';

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.status.value = 'connected';
        this.messages.value = [...this.messages.value, {
          system: true, text: `Connected to #${room}`, time: this._time()
        }];
      };

      this.socket.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          this.messages.value = [...this.messages.value, {
            author: data.author || 'Anonymous',
            text: data.text,
            time: this._time(),
          }];
        } catch {
          this.messages.value = [...this.messages.value, {
            author: 'System', text: e.data, time: this._time(),
          }];
        }
      };

      this.socket.onclose = () => {
        this.status.value = 'disconnected';
        this.messages.value = [...this.messages.value, {
          system: true, text: 'Disconnected. Reconnecting...', time: this._time()
        }];
        setTimeout(() => this._connect(), 2000);
      };

      this.socket.onerror = () => {
        this.status.value = 'disconnected';
      };
    } catch {
      // WebSocket not available (demo without backend)
      this.status.value = 'disconnected';
      this.messages.value = [{
        system: true,
        text: 'Demo mode — WebSocket requires a running Durable Object backend.',
        time: this._time(),
      }];
    }
  }

  _send() {
    const text = this.inputText.value.trim();
    if (!text || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    this.socket.send(JSON.stringify({
      author: this.username.value,
      text,
    }));

    this.inputText.value = '';
  }

  _time() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  render() {
    return html`
      <div class="header">
        <h3>#${this.prop('room') || 'lobby'}</h3>
        <span class="status ${() => this.status.value}">
          ${() => this.status.value}
        </span>
      </div>
      <div class="messages" id="msg-list">
        ${() => this.messages.value.map(m =>
          m.system
            ? html`<div class="msg system">${m.text} <span class="time">${m.time}</span></div>`
            : html`<div class="msg"><span class="author">${m.author}</span>: ${m.text} <span class="time">${m.time}</span></div>`
        )}
      </div>
      <div class="input-bar">
        <input
          type="text"
          placeholder="Type a message..."
          .value=${this.inputText}
          @keydown=${(e) => { if (e.key === 'Enter') this._send(); }}
          @input=${(e) => { this.inputText.value = e.target.value; }}
        />
        <button
          @click=${() => this._send()}
          ?disabled=${() => this.status.value !== 'connected'}
        >Send</button>
      </div>
    `;
  }
}

customElements.define('chat-room', ChatRoom);
