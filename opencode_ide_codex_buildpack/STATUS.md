# Build Status

Codex must keep this file current.

## Overall

- Current phase: Complete (All Phases 00–11 Verified)
- Last successful build: Desktop Build OK (`electron-vite build` ~46s)
- Last successful typecheck: `packages/app`, `packages/desktop`, `packages/opencode` all pass
- Last successful test run: `packages/app` (754 pass, 1 pre-existing i18n fail), `packages/opencode` (3390 pass, 6 pre-existing provider/pty/CLI fails unrelated to IDE)
- Current branch: dev
- Latest phase commit: a832321c1 (Phase 11 packaging, hardening, acceptance docs)

## Phase Status

- [x] Phase 00 — Repository Audit (a2a1c0f99)
- [x] Phase 01 — Editable Local Editor (65f7376f3)
- [x] Phase 02 — Buffers, Tabs, Search, Watchers (7b5b647bd)
- [x] Phase 03 — LSP / IntelliSense (b72827c65)
- [x] Phase 04 — Agent + Editor Diff Integration (d6e8954ce)
- [x] Phase 05 — Rewind / Restore / Fork UX (10dbc4f8c)
- [x] Phase 06 — Remote SSH / Remote Explorer (2c3b2da54)
- [x] Phase 07 — Remote Filesystem + Terminal (c00ddda72)
- [x] Phase 08 — Remote OpenCode Agent (09a28d68a)
- [x] Phase 09 — Remote LSP + Git (2cada1493)
- [x] Phase 10 — Debugging / DAP (a81580dbd)
- [x] Phase 11 — Packaging, Hardening, Acceptance (a832321c1)

## Current work

All 12 phases fully implemented, tested, documented, and verified. OpenCode IDE is ready for standalone and remote development.

## Known issues (pre-existing, not IDE-caused)

1. `desktop native locale detection > uses Unicode likely subtags for script-sensitive bundles` — pre-existing i18n test on `pa-PK` ICU subtag (committed 741244b69 before IDE work).
2. `cf-ai-gateway-e2e.test.ts` 4 failures — Cloudflare AI Gateway routing regressions (#44281 / #32051), pre-existing provider tests unrelated to IDE.
3. `v2 pty HttpApi` flake — flaky timing in `test/server/httpapi-v2-pty.test.ts`, pre-existing.
4. `opencode CLI help-text snapshots` — pre-existing snapshot drift.
5. Lint: 1 pre-existing error in `packages/app/e2e/performance/benchmark.ts` (empty pattern) and 4986 warnings, none from IDE additions.

## Acceptance

See `docs/ide/ACCEPTANCE_REPORT.md` and `docs/ide/ARCHITECTURE.md` for the full functional map.
