/**
 * Tina4 HTML — Tagged template literal renderer.
 *
 * html`<div>${value}</div>` returns real DOM nodes (DocumentFragment).
 * When a signal is interpolated, the DOM updates surgically — no diffing.
 */

import { effect, isSignal, type Signal } from './signal';

// Cache parsed templates by their static string parts identity
const templateCache = new WeakMap<TemplateStringsArray, HTMLTemplateElement>();

// Marker prefix used in comment placeholders
const MARKER = 't4:';

// ── Public API ──────────────────────────────────────────────────────

export function html(strings: TemplateStringsArray, ...values: unknown[]): DocumentFragment {
  let template = templateCache.get(strings);

  if (!template) {
    template = document.createElement('template');
    // Build HTML with comment markers for dynamic parts and attribute markers
    let markup = '';
    for (let i = 0; i < strings.length; i++) {
      markup += strings[i];
      if (i < values.length) {
        // Check if we're inside an attribute (look for an unclosed quote)
        const beforeMarker = markup;
        const inAttr = isInsideAttribute(beforeMarker);
        if (inAttr) {
          // Attribute binding: use a special sentinel value
          markup += `__t4_${i}__`;
        } else {
          // Content binding: use a comment node
          markup += `<!--${MARKER}${i}-->`;
        }
      }
    }
    template.innerHTML = markup;
    templateCache.set(strings, template);
  }

  const fragment = template.content.cloneNode(true) as DocumentFragment;
  bindContent(fragment, values);
  bindAttributes(fragment, values, strings);
  return fragment;
}

// ── Content Binding ─────────────────────────────────────────────────

function bindContent(root: DocumentFragment, values: unknown[]): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  const toProcess: { marker: Comment; index: number }[] = [];

  let node: Comment | null;
  while ((node = walker.nextNode() as Comment | null)) {
    if (node.data.startsWith(MARKER)) {
      const index = parseInt(node.data.slice(MARKER.length), 10);
      toProcess.push({ marker: node, index });
    }
  }

  for (const { marker, index } of toProcess) {
    const value = values[index];
    bindValue(marker, value);
  }
}

function bindValue(marker: Comment, value: unknown): void {
  if (isSignal(value)) {
    // Reactive text node — updates when signal changes
    const text = document.createTextNode('');
    marker.parentNode!.replaceChild(text, marker);
    effect(() => {
      text.data = String((value as Signal<unknown>).value ?? '');
    });

  } else if (typeof value === 'function') {
    // Dynamic region — function re-evaluated when its signals change
    const anchor = document.createComment('');
    marker.parentNode!.replaceChild(anchor, marker);
    let currentNodes: Node[] = [];

    effect(() => {
      const result = (value as () => unknown)();
      // Remove previous nodes
      for (const n of currentNodes) n.parentNode?.removeChild(n);
      currentNodes = [];
      // Insert new nodes
      const nodes = resultToNodes(result);
      const parent = anchor.parentNode!;
      for (const n of nodes) {
        parent.insertBefore(n, anchor);
        currentNodes.push(n);
      }
    });

  } else if (value instanceof DocumentFragment) {
    marker.parentNode!.replaceChild(value, marker);

  } else if (value instanceof Node) {
    marker.parentNode!.replaceChild(value, marker);

  } else if (Array.isArray(value)) {
    const frag = document.createDocumentFragment();
    for (const item of value) {
      const nodes = resultToNodes(item);
      for (const n of nodes) frag.appendChild(n);
    }
    marker.parentNode!.replaceChild(frag, marker);

  } else {
    // Static text
    const text = document.createTextNode(String(value ?? ''));
    marker.parentNode!.replaceChild(text, marker);
  }
}

// ── Attribute Binding ───────────────────────────────────────────────

function bindAttributes(root: DocumentFragment, values: unknown[], strings: TemplateStringsArray): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let el: Element | null;

  while ((el = walker.nextNode() as Element | null)) {
    const attrsToRemove: string[] = [];

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name;
      const rawValue = attr.value;

      // Check for event handlers: @click, @input, etc.
      if (name.startsWith('@')) {
        const eventName = name.slice(1);
        const match = rawValue.match(/__t4_(\d+)__/);
        if (match) {
          const index = parseInt(match[1], 10);
          const handler = values[index];
          if (typeof handler === 'function') {
            el.addEventListener(eventName, handler as EventListener);
          }
        }
        attrsToRemove.push(name);
        continue;
      }

      // Check for boolean attributes: ?disabled, ?hidden, etc.
      if (name.startsWith('?')) {
        const attrName = name.slice(1);
        const match = rawValue.match(/__t4_(\d+)__/);
        if (match) {
          const index = parseInt(match[1], 10);
          const value = values[index];
          if (isSignal(value)) {
            effect(() => {
              if ((value as Signal<unknown>).value) {
                el!.setAttribute(attrName, '');
              } else {
                el!.removeAttribute(attrName);
              }
            });
          } else {
            if (value) el.setAttribute(attrName, '');
          }
        }
        attrsToRemove.push(name);
        continue;
      }

      // Check for property bindings: .value, .innerHTML, etc.
      if (name.startsWith('.')) {
        const propName = name.slice(1);
        const match = rawValue.match(/__t4_(\d+)__/);
        if (match) {
          const index = parseInt(match[1], 10);
          const value = values[index];
          if (isSignal(value)) {
            effect(() => {
              (el as any)[propName] = (value as Signal<unknown>).value;
            });
          } else {
            (el as any)[propName] = value;
          }
        }
        attrsToRemove.push(name);
        continue;
      }

      // Regular attribute with dynamic value
      const match = rawValue.match(/__t4_(\d+)__/);
      if (match) {
        const index = parseInt(match[1], 10);
        const value = values[index];
        if (isSignal(value)) {
          effect(() => {
            const v = (value as Signal<unknown>).value;
            el!.setAttribute(name, String(v ?? ''));
          });
        } else if (typeof value === 'function') {
          effect(() => {
            const v = (value as () => unknown)();
            el!.setAttribute(name, String(v ?? ''));
          });
        } else {
          el.setAttribute(name, String(value ?? ''));
        }
      }
    }

    for (const name of attrsToRemove) {
      el.removeAttribute(name);
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function resultToNodes(value: unknown): Node[] {
  if (value == null || value === false) return [];
  if (value instanceof DocumentFragment) return Array.from(value.childNodes);
  if (value instanceof Node) return [value];
  if (Array.isArray(value)) {
    const nodes: Node[] = [];
    for (const item of value) nodes.push(...resultToNodes(item));
    return nodes;
  }
  return [document.createTextNode(String(value))];
}

function isInsideAttribute(html: string): boolean {
  // Count unmatched quotes to determine if we're inside an attribute value
  let inSingle = false;
  let inDouble = false;
  let inTag = false;

  for (let i = 0; i < html.length; i++) {
    const ch = html[i];
    if (ch === '<' && !inSingle && !inDouble) inTag = true;
    if (ch === '>' && !inSingle && !inDouble) inTag = false;
    if (inTag) {
      if (ch === '"' && !inSingle) inDouble = !inDouble;
      if (ch === "'" && !inDouble) inSingle = !inSingle;
    }
  }

  return inSingle || inDouble;
}
