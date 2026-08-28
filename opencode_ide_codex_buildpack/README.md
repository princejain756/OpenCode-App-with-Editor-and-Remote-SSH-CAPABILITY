# OpenCode IDE Fork — Codex Autonomous Build Pack

This folder is the execution specification for turning the current upstream OpenCode repository into a standalone AI-first IDE with:

- Full code editor
- File explorer
- Integrated terminal
- Git UI
- LSP/intellisense
- OpenCode AI agent
- Arbitrary BYOK/custom endpoint/model support
- Chat-linked code rewind/restore
- Fork/redo/diff workflows
- Remote Explorer
- SSH remote development
- Remote file editing
- Remote terminals
- Remote Git/LSP/build/test/Docker execution
- Cross-platform desktop packaging

## How Codex should use this pack

1. Read `00_MASTER_SPEC.md`
2. Read `01_EXECUTION_PROTOCOL.md`
3. Read `02_ARCHITECTURE_RULES.md`
4. Read `03_SECURITY_RULES.md`
5. Read `04_TEST_STRATEGY.md`
6. Execute phases in strict numerical order from `phases/`
7. Update `STATUS.md` after every meaningful milestone
8. Update `DECISIONS.md` for architecture decisions
9. Update `BLOCKERS.md` only for true blockers
10. Continue automatically until all phases are complete or a hard blocker makes further progress unsafe

Do not stop after producing a plan.

Do not ask for confirmation between phases unless the next phase would:
- delete user data,
- expose credentials,
- publish/deploy externally,
- require paid services,
- require unavailable secrets,
- or force an irreversible architectural decision that cannot be validated locally.

If uncertain, prefer a reversible implementation behind a clean abstraction and continue.

## Primary principle

Reuse OpenCode wherever possible.

Do not rebuild:
- provider handling,
- BYOK,
- agent loops,
- sessions,
- tools,
- MCP,
- permissions,
- snapshots,
- revert/fork,
- context handling,
- or model routing

unless the current repository proves that a required capability is missing.

The current checkout is the source of truth. Do not rely on assumptions about older OpenCode versions.
