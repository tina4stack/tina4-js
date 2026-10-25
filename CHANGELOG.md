# Changelog

## 1.7.5

### Changed
- **App build moved off Vite to esbuild.** `tina4js create` now scaffolds an esbuild
  project (matching the examples), and `tina4js dev` / `tina4js build` /
  `tina4js build --target php|python` run on esbuild - the same engine the library
  already builds with (scripts/build.mjs). New projects no longer pull Vite 5.4 or its
  advisories: the scaffold ships no `vite.config.ts`, no `vite-env.d.ts`, and no
  `vite`/`vitest` devDependencies. Routes are wired with a hand-written barrel (esbuild
  has no `import.meta.glob`) and `import.meta.env.DEV` is gone. `esbuild` moved to
  dependencies so a project's `tina4js dev/build` resolves it. (#33)

## 1.7.4

- fix(router): hash-mode routes now match when reached with a `?query` or
  `#fragment` tail - the router strips the query and fragment before it compares
  the path, so a deep link like `#/users?id=7` resolves to the `/users` route
  instead of falling through. The IIFE bundle is rebuilt with the canonical
  `build:iife` (esbuild, es2021).

## 1.7.3

- Remove the Vite/Vitest build toolchain from the bundled examples; the framework and its examples now build and test on esbuild + the Node.js test runner alone, clearing the development-dependency advisories.
- Detect template property-binding names with a linear single-pass scan instead of a backtracking regular expression, removing quadratic worst-case matching on long inputs.
- Parse router query parameters with `URLSearchParams`, removing the dynamic property write on user-controlled keys.
- Create the scaffolded SPA catch-all route with an atomic exclusive write, removing a check-then-write race in the CLI.
- Runtime dependencies remain empty.

## 1.7.2

- Adopt MPL-2.0 with Code Infinity commercial licensing available separately. Earlier releases retain their original licences.

- Harden HTML bindings, URL handling and realtime rendering against untrusted input.
- Limit authentication-token attachment to the intended request origin.
- Ship the verified generated browser bundle with the source changes.
- Update development test tooling to patched versions; runtime dependencies remain empty.
- Add release checksums, SPDX inventory and build attestations; pin release Actions.

