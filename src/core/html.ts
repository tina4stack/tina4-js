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
    let markup = '';
    for (let i = 0; i < strings.length; i++) {
      markup += strings[i];
      if (i < values.length) {
        const inAttr = isInsideAttribute(markup);
        if (inAttr) {
          markup += `__t4_${i}__`;
        } else {
          markup += `<!--${MARKER}${i}-->`;
        }
      }
    }
    template.innerHTML = markup;
    templateCache.set(strings, template);
  }

  const fragment = template.content.cloneNode(true) as DocumentFragment;
  // Collect markers first (recursive walk), then bind — avoids mutation during walk
  const comments = findComments(fragment);
  for (const { marker, index } of comments) {
    bindValue(marker, values[index]);
  }
  // Bind attributes on elements
  const elements = findElements(fragment);
  for (const el of elements) {
    bindElementAttrs(el, values);
  }
  return fragment;
}

// ── DOM Traversal (recursive, works in all DOM impls) ───────────────

function findComments(root: Node): { marker: Comment; index: number }[] {
  const results: { marker: Comment; index: number }[] = [];
  walkNodes(root, (node) => {
    if (node.nodeType === 8 /* COMMENT_NODE */) {
      const data = (node as Comment).data;
      if (data && data.startsWith(MARKER)) {
        const index = parseInt(data.slice(MARKER.length), 10);
        results.push({ marker: node as Comment, index });
      }
    }
  });
  return results;
}

function findElements(root: Node): Element[] {
  const results: Element[] = [];
  walkNodes(root, (node) => {
    if (node.nodeType === 1 /* ELEMENT_NODE */) {
      results.push(node as Element);
    }
  });
  return results;
}

function walkNodes(node: Node, callback: (node: Node) => void): void {
  const children = node.childNodes;
  // Walk children in reverse order of index so mutations don't affect iteration
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    callback(child);
    walkNodes(child, callback);
  }
}

// ── Content Binding ─────────────────────────────────────────────────

function bindValue(marker: Comment, value: unknown): void {
  const parent = marker.parentNode;
  if (!parent) return;

  if (isSignal(value)) {
    const text = document.createTextNode('');
    parent.replaceChild(text, marker);
    effect(() => {
      text.data = String((value as Signal<unknown>).value ?? '');
    });

  } else if (typeof value === 'function') {
    const anchor = document.createComment('');
    parent.replaceChild(anchor, marker);
    let currentNodes: Node[] = [];

    effect(() => {
      const result = (value as () => unknown)();
      for (const n of currentNodes) n.parentNode?.removeChild(n);
      currentNodes = [];
      const nodes = resultToNodes(result);
      const p = anchor.parentNode!;
      for (const n of nodes) {
        p.insertBefore(n, anchor);
        currentNodes.push(n);
      }
    });

  } else if (isDocFragment(value)) {
    parent.replaceChild(value as DocumentFragment, marker);

  } else if (value instanceof Node) {
    parent.replaceChild(value, marker);

  } else if (Array.isArray(value)) {
    const frag = document.createDocumentFragment();
    for (const item of value) {
      const nodes = resultToNodes(item);
      for (const n of nodes) frag.appendChild(n);
    }
    parent.replaceChild(frag, marker);

  } else {
    const text = document.createTextNode(String(value ?? ''));
    parent.replaceChild(text, marker);
  }
}

// ── Attribute Binding ───────────────────────────────────────────────

function bindElementAttrs(el: Element, values: unknown[]): void {
  const attrsToRemove: string[] = [];

  for (const attr of Array.from(el.attributes)) {
    const name = attr.name;
    const rawValue = attr.value;

    // Event handlers: @click, @input, etc.
    if (name.startsWith('@')) {
      const eventName = name.slice(1);
      const match = rawValue.match(/__t4_(\d+)__/);
      if (match) {
        const handler = values[parseInt(match[1], 10)];
        if (typeof handler === 'function') {
          el.addEventListener(eventName, handler as EventListener);
        }
      }
      attrsToRemove.push(name);
      continue;
    }

    // Boolean attributes: ?disabled, ?hidden, etc.
    if (name.startsWith('?')) {
      const attrName = name.slice(1);
      const match = rawValue.match(/__t4_(\d+)__/);
      if (match) {
        const val = values[parseInt(match[1], 10)];
        if (isSignal(val)) {
          const sigVal = val as Signal<unknown>;
          effect(() => {
            if (sigVal.value) {
              el.setAttribute(attrName, '');
            } else {
              el.removeAttribute(attrName);
            }
          });
        } else {
          if (val) el.setAttribute(attrName, '');
        }
      }
      attrsToRemove.push(name);
      continue;
    }

    // Property bindings: .value, .innerHTML, etc.
    if (name.startsWith('.')) {
      const propName = name.slice(1);
      const match = rawValue.match(/__t4_(\d+)__/);
      if (match) {
        const val = values[parseInt(match[1], 10)];
        if (isSignal(val)) {
          effect(() => { (el as any)[propName] = (val as Signal<unknown>).value; });
        } else {
          (el as any)[propName] = val;
        }
      }
      attrsToRemove.push(name);
      continue;
    }

    // Regular dynamic attribute
    const match = rawValue.match(/__t4_(\d+)__/);
    if (match) {
      const val = values[parseInt(match[1], 10)];
      if (isSignal(val)) {
        const sigVal = val as Signal<unknown>;
        effect(() => { el.setAttribute(name, String(sigVal.value ?? '')); });
      } else if (typeof val === 'function') {
        effect(() => { el.setAttribute(name, String((val as () => unknown)() ?? '')); });
      } else {
        el.setAttribute(name, String(val ?? ''));
      }
    }
  }

  for (const n of attrsToRemove) el.removeAttribute(n);
}

// ── Helpers ─────────────────────────────────────────────────────────

function resultToNodes(value: unknown): Node[] {
  if (value == null || value === false) return [];
  if (isDocFragment(value)) return Array.from((value as DocumentFragment).childNodes);
  if (value instanceof Node) return [value];
  if (Array.isArray(value)) {
    const nodes: Node[] = [];
    for (const item of value) nodes.push(...resultToNodes(item));
    return nodes;
  }
  return [document.createTextNode(String(value))];
}

function isDocFragment(value: unknown): boolean {
  return value != null && typeof value === 'object' && (value as Node).nodeType === 11;
}

function isInsideAttribute(markup: string): boolean {
  // If we're between a `<tag` and its closing `>`, we're in attribute context.
  // This handles both quoted (class="${val}") and unquoted (class=${val}) attrs.
  let inSingle = false;
  let inDouble = false;
  let inTag = false;

  for (let i = 0; i < markup.length; i++) {
    const ch = markup[i];
    if (ch === '<' && !inSingle && !inDouble) inTag = true;
    if (ch === '>' && !inSingle && !inDouble) inTag = false;
    if (inTag) {
      if (ch === '"' && !inSingle) inDouble = !inDouble;
      if (ch === "'" && !inDouble) inSingle = !inSingle;
    }
  }

  // Inside a tag (quoted or unquoted attribute value) = attribute context
  return inTag;
}
