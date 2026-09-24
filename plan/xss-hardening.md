# Feature: tina4-js XSS / token hardening

Outcome: client-side XSS and token-leak vectors closed; <3KB core budget green;
committed IIFE bundle in sync; full suite green. Branch fix/xss-hardening from origin/master.

## Scope
- [x] A1 (High): attribute interpolation keeps the static text around every hole
- [x] A2: refuse javascript:/vbscript:/data: (except data:image/*) in url attrs; ignore on* bindings
- [x] R1 (High): string route result rendered as text; rawHtml() opt-in for trusted markup
- [x] A3: fragment detection uses instanceof DocumentFragment/Node, not nodeType duck-typing
- [x] API1: Bearer + FreshToken only for same-origin or configured baseUrl origin
- [x] RTC1: rtc.upload/fetchBlob attach token only to a trusted origin
- [x] R3: async route guard is awaited (a Promise no longer counts as a pass)
- [x] R4: malformed % in a route param no longer throws out of resolve()
- [x] D1: debug routes panel escapes param keys/values
- [x] PWA1: generated service worker skips authenticated /api GETs

## Tests (real DOM renders / request-shape assertions, mutation-proved)
- [x] tests/xss-hardening.test.ts (A1/A2/R1/R3/R4/A3) — 14
- [x] tests/xss-api.test.ts (API1/RTC1/D1/PWA1) — 5
- [x] full suite: 390 passed; size budget: core 2.35KB gzip (<3KB); IIFE rebuilt in sync

## Bugs
- (none open)

## Commits
- (hash) tina4-js XSS/token hardening

## Status: Complete (local, macOS)
