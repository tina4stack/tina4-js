# Issue 13 — HTML comment interpolation context

## Goal

Treat valid HTML comments as comment syntax while determining whether a tagged-template interpolation is in element content or an attribute.

## Release

- Version: `1.5.2`
- Issue: `tina4stack/tina4-js#13`

## Plan

- [x] Reproduce apostrophe and double-quote comment cases with regression tests.
- [x] Skip valid HTML comments in the interpolation-context scanner.
- [x] Preserve normal content and attribute interpolation behavior.
- [x] Document the supported behavior.
- [x] Pass the focused regression tests.
- [x] Pass the complete test, build, type, and size gates.
- [ ] Publish and verify `tina4js@1.5.2`.
