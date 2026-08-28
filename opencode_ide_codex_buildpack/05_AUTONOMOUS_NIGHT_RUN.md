# Autonomous Night Run Instructions

This file exists specifically for unattended execution.

## Start command concept

After reading this pack, Codex should:

1. Audit repository.
2. Implement Phase 00.
3. Continue through all phases automatically.
4. Run validation after every phase.
5. Commit after every phase.
6. Keep `STATUS.md` current.
7. Continue around non-critical blockers.
8. Stop only for hard blockers defined in `01_EXECUTION_PROTOCOL.md`.

## Important

Do not wait for user approval after architecture unless the architecture reveals a hard blocker or a destructive/irreversible choice.

The original workflow may have expected review after Phase 00, but for this unattended run the user explicitly wants continued execution.

Therefore:

- produce the Phase 00 architecture documents,
- make the best reversible engineering decisions,
- document them,
- then proceed to Phase 01 automatically.

## Checkpoint discipline

After each phase create a commit with a message similar to:

- `ide: phase 00 repository audit`
- `ide: phase 01 editable local editor`
- `ide: phase 02 buffer and workspace search`
- `ide: phase 03 lsp integration`
- `ide: phase 04 agent editor integration`
- `ide: phase 05 rewind and fork timeline`
- `ide: phase 06 remote ssh explorer`
- `ide: phase 07 remote workspace filesystem terminal`
- `ide: phase 08 remote opencode agent`
- `ide: phase 09 remote lsp git`
- `ide: phase 10 debugger dap`
- `ide: phase 11 hardening acceptance`

If a phase needs multiple commits, keep them coherent and ensure the final phase commit leaves the tree buildable.

## Failure recovery

If tests fail:
1. determine whether failure is pre-existing
2. record pre-existing failures
3. fix phase-caused failures
4. rerun
5. continue only when the phase is not fundamentally broken

If a particular optional feature cannot be implemented:
- record why
- preserve clean extension point
- continue other work

## Never destroy existing project work

Do not:
- reset --hard user changes
- force push
- rewrite unrelated history
- delete branches
- delete user files
- run destructive database migrations
- deploy production infrastructure

unless explicitly required by the repository's safe test environment.

## End state

When work finishes, leave:
- clean or clearly documented working tree
- status report
- architecture docs
- test results
- acceptance report
- logical commits
- remaining blockers clearly listed
