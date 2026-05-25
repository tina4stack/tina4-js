# tina4-js/storage — Persistent Signals

Wrap a signal so its value survives a page refresh. Backed by `localStorage`
or `sessionStorage`. Zero dependencies. Opt-in per signal.

```javascript
import { signal } from 'tina4js';
import { persist } from 'tina4js/storage';

const theme = persist(signal('light'), { key: 'theme' });
theme.value = 'dark';   // survives a refresh
```

Before the API, read the dangers list. Twice.

## What this must never store

`localStorage` is XSS-readable. Any script on your origin reads every value.
Any browser extension reads every value. A persisted signal is the right tool
for small, safe, user-chosen preferences. It is the wrong tool for the
following, no exceptions:

| Do not store                                                       | Why                                                                                         | Where it belongs                                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Auth tokens, JWTs, session IDs, API keys                           | XSS-readable. One injected script reads them all.                                           | `httpOnly` + `Secure` + `SameSite` cookies.                       |
| Passwords, including "encrypted" or "hashed" client-side           | Encryption with a key sitting in the same bundle is theatre, not security.                  | Never client-side. The server hashes with bcrypt or argon2.       |
| Personal data: names, emails, phone numbers, addresses, ID numbers | POPIA and GDPR exposure on top of the XSS leak.                                             | The server. Fetch on demand, hold in memory only.                 |
| Payment data: card numbers, CVV, expiry                            | Not PCI-DSS compliant. A liability problem.                                                 | Tokenised by the payment processor.                               |
| Permission flags, roles, `isAdmin` booleans                        | The user can edit them in devtools. Persisting them tells the app to trust something false. | The server. Re-checked on every request.                          |
| Encryption keys, OTP seeds, secrets                                | XSS exfiltration. Compromise once, compromise the device.                                   | Never client-side.                                                |
| Authoritative server state: orders, balances, ledger entries       | The browser drifts from the database, and only one is right.                                | The database. Fetch fresh.                                        |
| State that must not survive a logout or device handover            | The next user inherits the previous user's drafts and filters.                              | Per-account on the server, or wipe with `clearPersistedKeys()`.   |
| Anything you would not paste into a public channel                 | If you would not show it to the team, do not write it to disk where every extension reads.  | Anywhere except the browser.                                      |

If you ignore this list, the framework will warn you in the console the first
time it sees a credential-shaped key or value. The warning is loud on purpose.

## What this is for

Small things the user chose, that the user expects back, that an attacker
gains nothing from reading:

- Theme, language, sidebar collapsed state.
- Last-used filter or view setting.
- Onboarding flags ("user dismissed the welcome banner").
- Local-only draft text the user expects to come back to.
- Guest cart contents (the server cart overrides on login).

## API

### `persist(signal, options)`

Wrap a signal so its value is read from storage on creation and written back
on every change.

```typescript
persist<T>(source: Signal<T>, options: PersistOptions<T>): PersistedSignal<T>
```

**Options:**

| Option                       | Type                                                          | Default   | What it does                                                                                |
| ---------------------------- | ------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------- |
| `key`                        | `string`                                                      | required  | Storage key. Required.                                                                      |
| `storage`                    | `'local' \| 'session'`                                        | `'local'` | `'local'` survives a refresh. `'session'` lives until the tab closes.                       |
| `serializer`                 | `{ read(s): T; write(v): string }`                            | JSON      | Custom serializer. Use for Date, Map, Set, or any non-JSON shape.                           |
| `version`                    | `number`                                                      | `1`       | Stored-shape version. Compared to the stored value's version on read.                       |
| `migrate`                    | `(oldValue, oldVersion) => T`                                 | undefined | Converts an older stored value to the current shape. Called when versions disagree.         |
| `syncTabs`                   | `boolean`                                                     | `false`   | Subscribe to the `storage` event so other tabs see writes. Opt-in.                          |
| `silenceCredentialWarning`   | `boolean`                                                     | `false`   | Suppress the credential-shape warning. Use only when you are certain the value is safe.     |

**Returns:** a `PersistedSignal<T>` — the same signal you passed in, with two
extra methods attached:

- `.clear()` — remove the key from storage. The signal keeps its current
  in-memory value.
- `.dispose()` — stop watching storage events and stop the write effect.
  Useful in tests.

### `clearPersistedKeys(keys, storage?)`

Remove several keys at once. Wire this to your logout handler so persisted
state does not leak to the next user on the device.

```typescript
clearPersistedKeys(keys: string[], storage: 'local' | 'session' = 'local'): void
```

## Examples

### Theme preference

```javascript
import { signal } from 'tina4js';
import { persist } from 'tina4js/storage';

const theme = persist(signal('light'), { key: 'theme' });

document.documentElement.dataset.theme = theme.value;
effect(() => {
  document.documentElement.dataset.theme = theme.value;
});
```

### Guest cart with cross-tab sync

```javascript
const cart = persist(signal([]), {
  key: 'cart',
  syncTabs: true,           // a second tab sees updates
});

cart.value = [...cart.value, { id: 1, name: 'Widget' }];
```

### A custom serializer for Date

```javascript
const lastVisit = persist(signal(new Date()), {
  key: 'lastVisit',
  serializer: {
    write: (d) => d.toISOString(),
    read: (s) => new Date(s),
  },
});
```

### Version migration on a deploy

```javascript
// v1 stored: { name: 'Alice' }
// v2 wants:  { firstName: 'Alice', lastName: '' }
const user = persist(signal({ firstName: '', lastName: '' }), {
  key: 'user',
  version: 2,
  migrate: (old) => ({
    firstName: (old as { name?: string }).name ?? '',
    lastName: '',
  }),
});
```

### Wipe on logout

```javascript
import { clearPersistedKeys } from 'tina4js/storage';

function logout() {
  api.post('/auth/logout');
  clearPersistedKeys(['cart', 'lastFilter', 'draftReply']);
  window.location.reload();
}
```

## Safety guarantees

The framework will:

- **Warn loudly** when a key name matches `token`, `password`, `secret`,
  `apikey`, `auth`, `credential`, `jwt`, `bearer`, `otp`, or `private_key`.
- **Warn loudly** when a string value looks like a JWT or a long base64 token.
- **Warn loudly** when an object value contains a field with a
  credential-shaped name.
- **No-op silently** when there is no `window` or `localStorage`, so SSR does
  not throw.
- **Log and continue** on `QuotaExceededError`. The app keeps working; the
  value is not persisted on that write.
- **Never offer encryption** as an option. Encrypting with a key in the same
  bundle is not security; it is a misleading checkbox.
- **Never enable cross-tab sync by default.** Every sync is opt-in per signal.

If you need the warning silenced for a key that is genuinely a coincidence
(e.g. `tokenColor` for a UI palette), pass `silenceCredentialWarning: true`.
This is the only knob, and it does nothing except quiet the console.

## Bundle size

`tina4-js/storage` adds about 1 KB gzipped on top of the core. If your app
does not import from `tina4-js/storage`, it ships zero bytes.
