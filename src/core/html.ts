/**
 * Tina4 HTML — Tagged template literal renderer.
 *
 * html`<div>${value}</div>` returns real DOM nodes (DocumentFragment).
 * When a signal is interpolated, the DOM updates surgically — no diffing.
 */

import { effect, batch, isSignal, _setEffectCollector, _getEffectCollector, type Signal } from './signal';

interface CachedTemplate {
  template: HTMLTemplateElement;
  propertyNames: Map<number, string>;
}

// Cache parsed templates and case-sensitive property names by static string identity.
// HTML parsing lowercases attribute names, so `.innerHTML` cannot be recovered from
// the parsed DOM and must be retained from the original template literal.
const templateCache = new WeakMap<TemplateStringsArray, CachedTemplate>();

// Marker prefix used in comment placeholders
const MARKER = 't4:';

// ── Public API ──────────────────────────────────────────────────────

/**
 * Tagged template literal renderer — builds real DOM nodes with surgical reactive updates.
 *
 * Interpolated values are bound as follows:
 * - `${signal}`      → reactive text node, updates in place when the signal changes
 * - `${() => expr}`  → reactive block, re-renders when any signal read inside changes
 * - `${fragment}`    → inserts a DocumentFragment (nested `html\`\``)
 * - `${array}`       → renders each item as nodes
 * - `${value}`       → static text node (escaped — XSS-safe)
 *
 * Attribute binding syntax (in tag attributes):
 * - `.innerHTML=${val}`  → sets DOM property (use for raw HTML / inline SVG)
 * - `.value=${signal}`   → reactive DOM property binding
 * - `?disabled=${sig}`   → boolean attribute — added/removed reactively
 * - `@click=${fn}`       → event listener
 *
 * **Important:** `${svgString}` in content position renders as escaped text.
 * To inject raw HTML or SVG, use: `<div .innerHTML=${svgString}></div>`
 *
 * @param strings - Template string parts (static, cached by identity).
 * @param values  - Interpolated values.
 * @returns A DocumentFragment ready to append to the DOM.
 *
 * @example
 * const name = signal('World');
 * const frag = html`<h1>Hello, ${name}!</h1>`;
 * document.body.appendChild(frag);
 * name.value = 'Tina4'; // DOM updates automatically
 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): DocumentFragment {
  let cachedTemplate = templateCache.get(strings);

  if (!cachedTemplate) {
    const template = document.createElement('template');
    const propertyNames = new Map<number, string>();
    let markup = '';
    for (let i = 0; i < strings.length; i++) {
      markup += strings[i];
      if (i < values.length) {
        const inAttr = isInsideAttribute(markup);
        if (inAttr) {
          const propertyName = findPropertyBindingName(strings[i]);
          if (propertyName) propertyNames.set(i, propertyName);
          markup += `__t4_${i}__`;
        } else {
          markup += `<!--${MARKER}${i}-->`;
        }
      }
    }
    template.innerHTML = markup;
    cachedTemplate = { template, propertyNames };
    templateCache.set(strings, cachedTemplate);
  }

  const fragment = cachedTemplate.template.content.cloneNode(true) as DocumentFragment;
  // Collect markers first (recursive walk), then bind — avoids mutation during walk
  const comments = findComments(fragment);
  for (const { marker, index } of comments) {
    bindValue(marker, values[index]);
  }
  // Bind attributes on elements
  const elements = findElements(fragment);
  for (const el of elements) {
    bindElementAttrs(el, values, cachedTemplate.propertyNames);
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
    let innerDisposers: (() => void)[] = [];

    effect(() => {
      // Dispose inner effects from previous evaluation
      for (const d of innerDisposers) d();
      innerDisposers = [];

      // Collect inner effects created by nested html`` templates
      const localCollector: (() => void)[] = [];
      const outerCollector = _getEffectCollector();
      _setEffectCollector(localCollector);

      const result = (value as () => unknown)();

      _setEffectCollector(outerCollector);
      innerDisposers = localCollector;

      for (const n of currentNodes) n.parentNode?.removeChild(n);
      currentNodes = [];
      const nodes = resultToNodes(result);
      const p = anchor.parentNode;
      if (!p) return; // anchor detached from DOM — skip insertion
      const ns = foreignNsOf(p);
      for (const n of nodes) {
        const nn = ns ? toNamespace(n, ns) : n;
        p.insertBefore(nn, anchor);
        currentNodes.push(nn);
      }
    });

  } else if (isDocFragment(value)) {
    const ns = foreignNsOf(parent);
    if (ns) {
      const frag = document.createDocumentFragment();
      for (const n of Array.from((value as DocumentFragment).childNodes)) frag.appendChild(toNamespace(n, ns));
      parent.replaceChild(frag, marker);
    } else {
      parent.replaceChild(value as DocumentFragment, marker);
    }

  } else if (value instanceof Node) {
    const ns = foreignNsOf(parent);
    parent.replaceChild(ns ? toNamespace(value, ns) : value, marker);

  } else if (Array.isArray(value)) {
    const ns = foreignNsOf(parent);
    const frag = document.createDocumentFragment();
    for (const item of value) {
      const nodes = resultToNodes(item);
      for (const n of nodes) frag.appendChild(ns ? toNamespace(n, ns) : n);
    }
    parent.replaceChild(frag, marker);

  } else {
    const text = document.createTextNode(String(value ?? ''));
    parent.replaceChild(text, marker);
  }
}

// ── Attribute Binding ───────────────────────────────────────────────

function bindElementAttrs(el: Element, values: unknown[], propertyNames: Map<number, string>): void {
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
          el.addEventListener(eventName, (e) => batch(() => (handler as EventListener)(e)));
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
        } else if (typeof val === 'function') {
          effect(() => {
            if ((val as () => unknown)()) {
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
      const match = rawValue.match(/__t4_(\d+)__/);
      if (match) {
        const valueIndex = parseInt(match[1], 10);
        const propName = propertyNames.get(valueIndex) ?? name.slice(1);
        const val = values[valueIndex];
        if (isSignal(val)) {
          // Reactive: track the signal's value through an effect.
          effect(() => { (el as any)[propName] = (val as Signal<unknown>).value; });
        } else if (typeof val === 'function') {
          // Reactive arrow form (`.value=${() => sig.value}`). Mirrors the
          // function branch a few lines below for regular attributes — any
          // signals the function reads inside the effect register as
          // dependencies, so the property updates when they change.
          // Without this, the function reference was assigned to the DOM
          // property and the browser stringified it (issue #4).
          effect(() => { (el as any)[propName] = (val as () => unknown)() ?? ''; });
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

// ── Foreign content (SVG / MathML) namespace repair ─────────────────
//
// The HTML parser only puts elements in the SVG/MathML namespace when they are
// parsed *inside* an <svg>/<math> ancestor. A whole-literal html`<svg>…</svg>`
// parses correctly, but an interpolated child template — html`<svg>${html`<circle/>`}</svg>`,
// the natural reusable-icon pattern — is parsed standalone, so its <circle> lands
// in the HTML namespace and renders invisibly once inserted under the <svg>.
//
// The destination namespace is only knowable at insertion time (from the parent),
// so we recreate HTML-namespaced nodes in the parent's foreign namespace as they
// are bound. Caveat: recreating an element drops listeners/property bindings that a
// nested html`` applied to that element — negligible for SVG/MathML shapes, which
// are static; use a whole-literal <svg> for interactive foreign content.

const SVG_NS = 'http://www.w3.org/2000/svg';
const MATHML_NS = 'http://www.w3.org/1998/Math/MathML';
const HTML_NS = 'http://www.w3.org/1999/xhtml';

// The foreign namespace inserted children must adopt, or null for ordinary HTML.
function foreignNsOf(parent: Node | null): string | null {
  let n: Node | null = parent;
  while (n && n.nodeType === 1 /* ELEMENT_NODE */) {
    const el = n as Element;
    const ns = el.namespaceURI;
    // Inside <foreignObject> content is HTML again — no repair needed.
    if (ns === SVG_NS && el.localName === 'foreignObject') return null;
    if (ns === SVG_NS || ns === MATHML_NS) return ns;
    if (ns === HTML_NS) return null;
    n = n.parentNode;
  }
  return null;
}

// Recreate `node` (and descendants) in namespace `ns` when it is an HTML element.
// Text/comment nodes are namespace-neutral and returned untouched.
function toNamespace(node: Node, ns: string): Node {
  if (node.nodeType !== 1 /* ELEMENT_NODE */) return node;
  const el = node as Element;
  if (el.namespaceURI === ns) {
    // Correct namespace already, but a mixed subtree can still hold stray HTML.
    for (const c of Array.from(el.childNodes)) {
      const rc = toNamespace(c, ns);
      if (rc !== c) el.replaceChild(rc, c);
    }
    return el;
  }
  const created = document.createElementNS(ns, el.localName);
  for (const a of Array.from(el.attributes)) created.setAttribute(a.name, a.value);
  // <foreignObject> switches its own children back to HTML.
  const childNs = (ns === SVG_NS && el.localName === 'foreignObject') ? HTML_NS : ns;
  for (const c of Array.from(el.childNodes)) created.appendChild(toNamespace(c, childNs));
  return created;
}

// ── Helpers ─────────────────────────────────────────────────────────

function findPropertyBindingName(staticPart: string): string | undefined {
  return staticPart.match(/\.([^\s"'<>/=]+)\s*=\s*["']?$/)?.[1];
}

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
    // Quotes inside a valid HTML comment are text, not attribute delimiters.
    // Skip the whole comment so it cannot change the surrounding context.
    if (!inTag && markup.startsWith('<!--', i)) {
      const commentEnd = markup.indexOf('-->', i + 4);
      if (commentEnd === -1) return false;
      i = commentEnd + 2;
      continue;
    }

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
