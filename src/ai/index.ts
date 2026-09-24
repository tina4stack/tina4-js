// Copyright (c) 2026 Code Infinity
// SPDX-License-Identifier: MPL-2.0
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

/**
 * tina4js/ai — Typed streaming AI client on top of sse.connect().
 *
 * See ADR-0060 (typed AiEvent stream) and ADR-0061 (tools / tool_choice /
 * tool_result send-side additions) in the tina4-documentation repo for the
 * wire contract this module speaks to.
 */

export { ai } from './ai';
export type {
  AiEvent,
  ContentPart,
  AiMessage,
  AiTool,
  AiToolChoice,
  AiChatOptions,
} from './ai';
