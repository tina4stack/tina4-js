/**
 * tina4js/rtc — realtime collaboration client (calls, chat, files).
 *
 * Talks to a Tina4 backend's `realtime()` mount. See rtc.ts for the full API.
 */
export { rtc, rtcConfig } from './rtc';
export type {
  RtcConfig,
  CallStatus, CallOptions, CallSession, RemotePeer,
  ChatOptions, ChatSession, ChatMessage,
  FileOptions, UploadResult,
} from './rtc';
