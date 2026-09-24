// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

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
