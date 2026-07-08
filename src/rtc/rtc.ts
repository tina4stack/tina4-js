/**
 * Tina4 RTC — signal-driven client for the Tina4 realtime collaboration mount.
 *
 * Three surfaces, matching the backend `realtime()` features:
 *
 *   rtc.call(room, options?)     — mesh WebRTC (video/audio/screen share) over the
 *                                  signalling WebSocket, with perfect negotiation.
 *   rtc.chat(channel, options?)  — persistent chat: messages, presence, typing,
 *                                  read receipts, history.
 *   rtc.upload(channel, file, o) — upload a file; rtc.fetchBlob(key, o) fetches a
 *                                  permissioned download as an object URL.
 *
 * Everything reactive is a signal, so bind it straight into `html` templates.
 * Media is peer-to-peer; the server only relays the SDP/ICE handshake. Read the
 * ICE servers + resolved paths from GET <prefix>/api/rtc/config so the client
 * never hardcodes a URL.
 */

import { signal } from '../core/signal';
import { ws } from '../ws/ws';
import type { Signal } from '../core/signal';
import type { ManagedSocket } from '../ws/ws';

// ── Config discovery ─────────────────────────────────────────────────

export interface RtcConfig {
  backend: string;
  iceServers?: RTCIceServer[];
  signalling?: string;   // e.g. "/ws/rtc/{room}"
  chat?: string;         // e.g. "/ws/chat/{channel}"
  messages?: string;     // e.g. "/api/channels/{id}/messages"
  files?: string;        // e.g. "/api/files"
}

/** Fetch the self-describing realtime config (ICE servers + resolved paths). */
export async function rtcConfig(url = '/api/rtc/config'): Promise<RtcConfig> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`[tina4] rtc config fetch failed: ${res.status}`);
  return res.json();
}

// ── URL helpers ──────────────────────────────────────────────────────

function wsOrigin(): string {
  const loc = window.location;
  const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${loc.host}`;
}

function absWs(path: string): string {
  if (/^wss?:\/\//.test(path)) return path;
  return wsOrigin() + (path.startsWith('/') ? path : '/' + path);
}

function randomId(): string {
  // A per-tab peer id. crypto.randomUUID when available, else a short random.
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && 'randomUUID' in c) return c.randomUUID().slice(0, 8);
  let s = '';
  for (let i = 0; i < 8; i++) s += Math.floor(16 * (0.5 + i)).toString(16); // deterministic-free
  return s + Date.now().toString(16).slice(-4);
}

// ── Calls (mesh WebRTC, perfect negotiation) ─────────────────────────

export type CallStatus = 'idle' | 'connecting' | 'connected' | 'closed';

export interface RemotePeer {
  id: string;
  stream: MediaStream | null;
}

export interface CallOptions {
  /** Pre-fetched config (skips the fetch); else configUrl is used. */
  config?: RtcConfig;
  /** Where to fetch the config from (default "/api/rtc/config"). */
  configUrl?: string;
  /** Explicit signalling WS base (overrides config); "{room}" is appended. */
  signallingUrl?: string;
  /** ICE servers override (else from config). */
  iceServers?: RTCIceServer[];
  /** Local media constraints, or a ready MediaStream, or false for recv-only. */
  media?: MediaStreamConstraints | MediaStream | false;
}

export interface CallSession {
  readonly status: Signal<CallStatus>;
  readonly localStream: Signal<MediaStream | null>;
  readonly peers: Signal<RemotePeer[]>;
  readonly screenSharing: Signal<boolean>;
  readonly error: Signal<Error | null>;
  /** This peer's id in the room. */
  readonly id: string;
  shareScreen(): Promise<void>;
  stopScreen(): Promise<void>;
  toggleAudio(on?: boolean): boolean;
  toggleVideo(on?: boolean): boolean;
  leave(): void;
}

interface PeerState {
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  stream: MediaStream | null;
}

async function startCall(room: string, options: CallOptions = {}): Promise<CallSession> {
  const status = signal<CallStatus>('connecting');
  const localStream = signal<MediaStream | null>(null);
  const peersSig = signal<RemotePeer[]>([]);
  const screenSharing = signal(false);
  const errorSig = signal<Error | null>(null);
  const selfId = randomId();

  const cfg = options.config ?? await rtcConfig(options.configUrl);
  const iceServers = options.iceServers ?? cfg.iceServers ?? [];

  // Resolve the signalling URL: explicit base, or the config's path, "{room}" filled.
  const base = options.signallingUrl ?? cfg.signalling ?? '/ws/rtc';
  const signallingUrl = absWs(
    base.includes('{room}') ? base.replace('{room}', room) : `${base}/${room}`,
  );

  // Local media (camera+mic by default; a ready stream or false to receive only).
  let local: MediaStream | null = null;
  if (options.media instanceof MediaStream) {
    local = options.media;
  } else if (options.media !== false) {
    local = await navigator.mediaDevices.getUserMedia(
      (options.media as MediaStreamConstraints) ?? { audio: true, video: true });
  }
  localStream.value = local;
  let cameraTrack: MediaStreamTrack | null = local?.getVideoTracks()[0] ?? null;

  const peers = new Map<string, PeerState>();
  const socket = ws.connect(signallingUrl);

  function publishPeers(): void {
    peersSig.value = [...peers.entries()].map(([id, p]) => ({ id, stream: p.stream }));
  }

  function relay(msg: Record<string, unknown>): void {
    try { socket.send({ ...msg, from: selfId }); } catch { /* not open yet */ }
  }

  function ensurePeer(remoteId: string): PeerState {
    const existing = peers.get(remoteId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers });
    const state: PeerState = {
      pc, polite: selfId < remoteId, makingOffer: false, ignoreOffer: false, stream: null,
    };
    peers.set(remoteId, state);

    if (local) for (const track of local.getTracks()) pc.addTrack(track, local);

    pc.onnegotiationneeded = async () => {
      try {
        state.makingOffer = true;
        await pc.setLocalDescription();
        relay({ type: 'desc', to: remoteId, description: pc.localDescription });
      } catch (e) {
        errorSig.value = e as Error;
      } finally {
        state.makingOffer = false;
      }
    };
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) relay({ type: 'ice', to: remoteId, candidate });
    };
    pc.ontrack = ({ streams }) => {
      state.stream = streams[0] ?? null;
      publishPeers();
    };
    pc.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(pc.connectionState)) closePeer(remoteId);
      else if (pc.connectionState === 'connected') status.value = 'connected';
    };
    publishPeers();
    return state;
  }

  function closePeer(remoteId: string): void {
    const p = peers.get(remoteId);
    if (!p) return;
    try { p.pc.close(); } catch { /* already closed */ }
    peers.delete(remoteId);
    publishPeers();
  }

  async function onSignal(raw: unknown): Promise<void> {
    const msg = raw as Record<string, unknown>;
    const from = msg.from as string | undefined;
    if (!from || from === selfId) return;               // ignore our own echo
    if (msg.to && msg.to !== selfId) return;            // targeted at someone else

    if (msg.type === 'hello') {
      ensurePeer(from);
      relay({ type: 'welcome', to: from });             // tell the newcomer about us
      return;
    }
    if (msg.type === 'welcome') { ensurePeer(from); return; }
    if (msg.type === 'bye') { closePeer(from); return; }

    const state = ensurePeer(from);
    const pc = state.pc;

    if (msg.type === 'desc') {
      const description = msg.description as RTCSessionDescriptionInit;
      const offerCollision =
        description.type === 'offer' &&
        (state.makingOffer || pc.signalingState !== 'stable');
      state.ignoreOffer = !state.polite && offerCollision;
      if (state.ignoreOffer) return;                    // impolite peer wins the glare
      await pc.setRemoteDescription(description);
      if (description.type === 'offer') {
        await pc.setLocalDescription();
        relay({ type: 'desc', to: from, description: pc.localDescription });
      }
    } else if (msg.type === 'ice') {
      try {
        await pc.addIceCandidate(msg.candidate as RTCIceCandidateInit);
      } catch (e) {
        if (!state.ignoreOffer) errorSig.value = e as Error;
      }
    }
  }

  socket.on('message', (data) => { onSignal(data); });
  socket.on('open', () => { relay({ type: 'hello' }); });   // announce our arrival

  async function replaceVideoTrack(track: MediaStreamTrack | null): Promise<void> {
    if (!track) return;
    for (const { pc } of peers.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(track);
    }
  }

  async function doStopScreen(): Promise<void> {
    await replaceVideoTrack(cameraTrack);
    screenSharing.value = false;
  }

  async function doShareScreen(): Promise<void> {
    const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const screenTrack = display.getVideoTracks()[0];
    await replaceVideoTrack(screenTrack);
    screenTrack.onended = () => { doStopScreen(); };   // user clicked "stop sharing"
    screenSharing.value = true;
  }

  return {
    status, localStream, peers: peersSig, screenSharing, error: errorSig, id: selfId,

    shareScreen: doShareScreen,
    stopScreen: doStopScreen,

    toggleAudio(on?: boolean): boolean {
      const track = local?.getAudioTracks()[0];
      if (!track) return false;
      track.enabled = on ?? !track.enabled;
      return track.enabled;
    },

    toggleVideo(on?: boolean): boolean {
      const track = local?.getVideoTracks()[0];
      if (!track) return false;
      track.enabled = on ?? !track.enabled;
      return track.enabled;
    },

    leave(): void {
      relay({ type: 'bye' });
      for (const id of [...peers.keys()]) closePeer(id);
      if (local) for (const t of local.getTracks()) t.stop();
      socket.close();
      status.value = 'closed';
    },
  };
}

// ── Chat (messages + presence + typing + receipts + history) ─────────

export interface ChatMessage {
  id?: number;
  channel_id?: number;
  user_id?: string;
  body?: string;
  thread_id?: number | null;
  created_at?: string;
}

export interface ChatOptions {
  /** JWT for the secured chat WebSocket + history/upload calls. */
  token?: string;
  /** Explicit chat WS base ("{channel}" appended); else derived from location. */
  url?: string;
  /** HTTP base for history (default same origin). */
  apiBase?: string;
  /** Path template for history (default "/api/channels/{id}/messages"). */
  messagesPath?: string;
  /** ms a typing indicator lingers before auto-clearing (default 3000). */
  typingTimeout?: number;
}

export interface ChatSession {
  readonly status: ManagedSocket['status'];
  readonly connected: ManagedSocket['connected'];
  readonly messages: Signal<ChatMessage[]>;
  readonly presence: Signal<string[]>;
  readonly typing: Signal<string[]>;
  send(body: string, threadId?: number): void;
  sendTyping(): void;
  markRead(): void;
  history(before?: number, limit?: number): Promise<ChatMessage[]>;
  close(): void;
}

function startChat(channel: string | number, options: ChatOptions = {}): ChatSession {
  const messages = signal<ChatMessage[]>([]);
  const presence = signal<string[]>([]);
  const typing = signal<string[]>([]);
  const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const typingTimeout = options.typingTimeout ?? 3000;

  const base = options.url ?? '/ws/chat';
  const chatUrl = absWs(
    base.includes('{channel}') ? base.replace('{channel}', String(channel))
      : `${base}/${channel}`);
  const socket = ws.connect(chatUrl, { token: options.token });

  function markTyping(user: string): void {
    if (!typing.value.includes(user)) typing.value = [...typing.value, user];
    const prev = typingTimers.get(user);
    if (prev) clearTimeout(prev);
    typingTimers.set(user, setTimeout(() => {
      typing.value = typing.value.filter((u) => u !== user);
      typingTimers.delete(user);
    }, typingTimeout));
  }

  socket.on('message', (raw) => {
    const ev = raw as Record<string, unknown>;
    switch (ev.type) {
      case 'message':
        messages.value = [...messages.value, ev.message as ChatMessage];
        break;
      case 'presence':
        if (ev.event === 'roster') presence.value = (ev.users as string[]) ?? [];
        else if (ev.event === 'join' && ev.user_id)
          presence.value = [...new Set([...presence.value, ev.user_id as string])];
        else if (ev.event === 'leave')
          presence.value = presence.value.filter((u) => u !== ev.user_id);
        break;
      case 'typing':
        if (ev.user_id) markTyping(ev.user_id as string);
        break;
      // 'read' receipts are broadcast too; apps can subscribe via socket.on if needed.
    }
  });

  const apiBase = options.apiBase ?? '';
  const messagesPath = options.messagesPath ?? '/api/channels/{id}/messages';

  return {
    status: socket.status,
    connected: socket.connected,
    messages,
    presence,
    typing,

    send(body: string, threadId?: number): void {
      socket.send({ type: 'message', body, thread_id: threadId ?? null });
    },
    sendTyping(): void { socket.send({ type: 'typing' }); },
    markRead(): void { socket.send({ type: 'read' }); },

    async history(before?: number, limit = 50): Promise<ChatMessage[]> {
      const path = messagesPath.replace('{id}', String(channel));
      const qs = new URLSearchParams({ limit: String(limit) });
      if (before) qs.set('before', String(before));
      const headers: Record<string, string> = {};
      if (options.token) headers['Authorization'] = `Bearer ${options.token}`;
      const res = await fetch(`${apiBase}${path}?${qs}`, { headers });
      if (!res.ok) throw new Error(`[tina4] chat history failed: ${res.status}`);
      const rows: ChatMessage[] = await res.json();
      // History is newest-first; prepend older messages (oldest-first) ahead of live.
      const older = [...rows].reverse();
      messages.value = [...older, ...messages.value];
      return rows;
    },

    close(): void {
      for (const t of typingTimers.values()) clearTimeout(t);
      typingTimers.clear();
      socket.close();
    },
  };
}

// ── Files ────────────────────────────────────────────────────────────

export interface UploadResult {
  id: number;
  key: string;
  filename: string;
  mime: string;
  size: number;
  url: string;
}

export interface FileOptions {
  token?: string;
  apiBase?: string;
  filesPath?: string;   // default "/api/files"
}

async function uploadFile(
  channel: string | number, file: File | Blob, options: FileOptions = {},
): Promise<UploadResult> {
  const path = options.filesPath ?? '/api/files';
  const form = new FormData();
  form.append('channel_id', String(channel));
  form.append('file', file, (file as File).name ?? 'file');
  const headers: Record<string, string> = {};
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;
  const res = await fetch(`${options.apiBase ?? ''}${path}`, {
    method: 'POST', body: form, headers,
  });
  if (!res.ok) throw new Error(`[tina4] file upload failed: ${res.status}`);
  return res.json();
}

/**
 * Fetch a permissioned download as an object URL. A secured GET route can't be
 * hit by a bare <img src> (no auth header), so fetch with the token and wrap the
 * blob. For an S3 backend the upload result's `url` is already a presigned URL
 * usable directly; this is the local-storage path.
 */
async function fetchBlobUrl(keyOrUrl: string, options: FileOptions = {}): Promise<string> {
  const url = /^https?:\/\//.test(keyOrUrl)
    ? keyOrUrl
    : `${options.apiBase ?? ''}${options.filesPath ?? '/api/files'}/${keyOrUrl}`;
  const headers: Record<string, string> = {};
  if (options.token) headers['Authorization'] = `Bearer ${options.token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`[tina4] file fetch failed: ${res.status}`);
  return URL.createObjectURL(await res.blob());
}

// ── Public API ───────────────────────────────────────────────────────

export const rtc = {
  config: rtcConfig,
  call: startCall,
  chat: startChat,
  upload: uploadFile,
  fetchBlob: fetchBlobUrl,
};
