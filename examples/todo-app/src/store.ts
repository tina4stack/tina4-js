import { signal, computed, batch } from 'tina4js';

// ── Types ────────────────────────────────────────────────────────────

export interface Todo {
  id: number;
  text: string;
  done: boolean;
}

export type Filter = 'all' | 'active' | 'completed';

// ── State ────────────────────────────────────────────────────────────

let nextId = 1;

export const todos = signal<Todo[]>([]);
export const filter = signal<Filter>('all');

// ── Derived ──────────────────────────────────────────────────────────

export const filteredTodos = computed(() => {
  const f = filter.value;
  const list = todos.value;
  if (f === 'active') return list.filter(t => !t.done);
  if (f === 'completed') return list.filter(t => t.done);
  return list;
});

export const remaining = computed(() =>
  todos.value.filter(t => !t.done).length
);

export const totalCount = computed(() => todos.value.length);

// ── Actions ──────────────────────────────────────────────────────────

export function addTodo(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  todos.value = [...todos.value, { id: nextId++, text: trimmed, done: false }];
}

export function toggleTodo(id: number) {
  todos.value = todos.value.map(t =>
    t.id === id ? { ...t, done: !t.done } : t
  );
}

export function removeTodo(id: number) {
  todos.value = todos.value.filter(t => t.id !== id);
}

export function clearCompleted() {
  todos.value = todos.value.filter(t => !t.done);
}

export function toggleAll() {
  const allDone = remaining.value === 0;
  todos.value = todos.value.map(t => ({ ...t, done: !allDone }));
}
