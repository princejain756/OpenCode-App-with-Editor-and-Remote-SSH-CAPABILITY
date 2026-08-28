# Phase 10 — Debugging / DAP

## Goal
Add production-grade debugging architecture.

## Preferred
Debug Adapter Protocol.

## Required
At minimum:
- debug configuration model
- start/stop
- breakpoints
- call stack
- variables
- debug console
- one validated mainstream runtime

## Remote
Architecture must allow debug adapter to run on remote workspace.

## If full remote debugging cannot be completed safely
Implement:
- clean DAP service boundary
- local validated debugger
- remote transport scaffolding
- documented remaining work

Do not fake support.

## Exit criteria
Debugger is real and extensible.
