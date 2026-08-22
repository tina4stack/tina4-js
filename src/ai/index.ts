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
