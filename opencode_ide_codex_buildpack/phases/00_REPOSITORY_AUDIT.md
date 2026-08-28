# Phase 00 — Repository Audit and Architecture

## Goal
Understand the current checkout before implementation.

## Tasks
Inspect:
- monorepo/package structure
- desktop stack
- current file explorer
- file viewing/editing capabilities
- tabs
- terminal
- project/workspace model
- OpenCode server/client
- SDK
- sessions/messages
- snapshots/revert/unrevert/fork
- provider configuration
- model routing
- filesystem APIs
- existing LSP
- Git support
- remote/server support
- desktop packaging
- test infrastructure

## Deliverables
Create/update:
- `docs/ide/ARCHITECTURE.md`
- `docs/ide/ROADMAP.md`
- `UPSTREAM.md`
- `DECISIONS.md`

Document:
1. reusable existing features
2. missing features
3. exact packages/files likely to change
4. chosen editor technology
5. local workspace abstraction
6. SSH architecture
7. remote OpenCode architecture
8. LSP architecture
9. snapshot/revert/fork behavior
10. major risks
11. Phase 1 implementation plan

## Validation
Run the repository's current:
- install/bootstrap
- lint
- typecheck
- tests
- desktop build

Record pre-existing failures separately.

## Exit criteria
Architecture is specific enough to implement without guessing.
Then continue automatically to Phase 01.
