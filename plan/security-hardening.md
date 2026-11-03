# Task: tina4-js security hardening

## Problem
GitHub flags security issues on tina4-js. Investigated with the real tooling
(token lacks `security_events` scope, so alert APIs 404 — used `npm audit` + repo
settings API as the authoritative source).

Findings:
- Shipped code is clean: `dependencies = {}`, `npm audit --omit=dev` → 0 vulns.
- Full tree: 1 HIGH — `happy-dom` (TEST-ONLY devDependency), two advisories:
  incomplete fix for CVE-2026-33943 (import-alias → host code execution) and SSRF
  via iframe/link stylesheet when parsing UNTRUSTED HTML. Fix: `happy-dom@21.0.4`
  (semver-major from `^20.8.9`). Never shipped (not in `dependencies`); exploit
  path (untrusted HTML) is not live in our own-fixture tests — but it is the
  Dependabot alert, and a one-line bump clears it.
- Posture gaps: Dependabot *security updates* were DISABLED (alerts fired, nothing
  auto-remediated); no CodeQL on a repo that ships JS to browsers.

## Plan
- [x] (a) Bump `happy-dom` `^20.8.9` → `^21.0.4`; re-audit (0 vulns full tree)
- [x] (a) Verify the full suite on happy-dom 21 — major bump is the gate
- [x] (b) Add `.github/workflows/codeql.yml` (javascript-typescript, build-mode none,
      SHA-pinned to match repo convention, PR + push + weekly)
- [x] (b) Add `.github/codeql/codeql-config.yml` — paths-ignore dist/examples/tests
      (non-shipped / minified) per the maintainer sweep floor
- [x] (b) Enable Dependabot security updates via API (now `enabled`)

## Verification (no mocks — real suite, real audit)
| Check | Before | After |
|-------|--------|-------|
| `npm test` | 401 pass / 0 fail / 0 skip | 401 pass / 0 fail / 0 skip |
| `npm audit` full tree | 1 high (happy-dom) | 0 |
| `npm audit --omit=dev` (shipped) | 0 | 0 |
| committed `dist/tina4js.min.js` | — | unchanged (no src touched) |
| Dependabot security updates | disabled | enabled |

## Parity note
tina4-js is the frontend framework, not one of the four backends — no cross-
framework port. happy-dom is a JS-only test dep. (The CodeQL/Dependabot posture
sweep is worth running across the other shipped repos as a follow-up.)

## Status: Done — verified locally; PR off master
