/**
 * tina4js/core — Reactive primitives, HTML renderer, and web component base.
 */

export { signal, computed, effect, batch, isSignal } from './signal';
export type { Signal, ReadonlySignal } from './signal';
export { html } from './html';
export { Tina4Element } from './component';
export type { PropType } from './component';
