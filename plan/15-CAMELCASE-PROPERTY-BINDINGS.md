# Task: Preserve camelCase DOM property bindings

**Outcome:** Property bindings use the exact property name written by the developer, so bindings such as `.innerHTML` and custom camelCase properties survive HTML parsing and update reactively.

## Scope

- [x] Reproduce HTML parser lowercasing of `.innerHTML`.
- [x] Preserve the original property name outside the parsed DOM attribute.
- [x] Build the package and browser bundle for release 1.5.3.
- [x] Verify the release on the Linux lab as root.
- [x] Make the clean-checkout size test a real gate instead of a warning-and-return ghost test.
- [x] Remove known vulnerabilities from the release toolchain without adding runtime dependencies.
- [x] Make clean history URLs canonical in scaffolds, examples, documentation, and skills; keep hash routing as an explicit static-host fallback.
- [x] Remove the Tina4 Metrics error-severity offender in `persist()` without changing its public API.

## Parity

| Surface | tina4-js |
|---|---|
| Static camelCase property binding | ✅ |
| Signal camelCase property binding | ✅ |
| Function camelCase property binding | ✅ |
| Inline SVG through `.innerHTML` | ✅ |

## Tests

- [x] A real parsed `.innerHTML` binding injects inline SVG.
- [x] A signal updates the exact `.textContent` property.
- [x] A reactive function updates an exact custom camelCase property with its native value.
- [x] Mutation proof: the new regression tests fail against the pre-fix binder.
- [x] Mutation proof: the size test fails when a required bundle is absent.
- [x] All 20 persistent-storage behavior tests pass after the Metrics refactor.
- [x] Tina4 Metrics reports `persist()` complexity 4 instead of 22 and no production-source errors.
- [x] Full test, type, build, and size gates pass locally at release HEAD.

## Bugs

- [x] HTML parsing lowercases property-binding attribute names, silently assigning an inert lowercase expando instead of the requested DOM property.
- [x] The property-binding test group names `.innerHTML` but does not test any camelCase property.
- [x] A clean checkout silently skips every bundle-size assertion because the build has not run yet.
- [x] The 1.5.2 dev-tool lock contains 10 known vulnerabilities; the published package has zero runtime dependencies.
- [x] Hash-mode `navigate()` relies on an asynchronously delivered `hashchange`, unlike history-mode navigation; the old DOM simulator fired synchronously and hid the inconsistency.
- [x] The router defaults to history mode, but the project and page scaffolders force confusing `/#/` URLs.
- [x] Tina4 Metrics reports `persist()` at cyclomatic complexity 22 (`error`).

## Commits

- `f1e6d24` — preserve camelCase property bindings and add regression coverage.
- `6877d88` — resolve hash navigation synchronously.
- `fab28b8` — harden release gates, make clean URLs canonical, and remove the Metrics error in `persist()`.

## Status: Complete
