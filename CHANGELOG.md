# Changelog

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

