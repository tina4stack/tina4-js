# Task: Preserve camelCase DOM property bindings

**Outcome:** Property bindings use the exact property name written by the developer, so bindings such as `.innerHTML` and custom camelCase properties survive HTML parsing and update reactively.

## Scope

- [x] Reproduce HTML parser lowercasing of `.innerHTML`.
- [x] Preserve the original property name outside the parsed DOM attribute.
- [x] Build the package and browser bundle for release 1.5.3.
- [ ] Verify the release on the Linux lab.

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
- [x] Full test, type, build, and size gates pass locally at release HEAD.

## Bugs

- [x] HTML parsing lowercases property-binding attribute names, silently assigning an inert lowercase expando instead of the requested DOM property.
- [x] The property-binding test group names `.innerHTML` but does not test any camelCase property.

## Commits

- (pending)

## Status: In Progress
