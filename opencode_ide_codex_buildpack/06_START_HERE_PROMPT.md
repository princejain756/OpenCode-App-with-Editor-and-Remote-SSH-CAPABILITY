# Paste This Into Codex

You are working inside the latest OpenCode repository checkout.

A specification pack has been provided in this repository.

Start by reading these files in order:

1. `README.md`
2. `00_MASTER_SPEC.md`
3. `01_EXECUTION_PROTOCOL.md`
4. `02_ARCHITECTURE_RULES.md`
5. `03_SECURITY_RULES.md`
6. `04_TEST_STRATEGY.md`
7. `05_AUTONOMOUS_NIGHT_RUN.md`
8. `STATUS.md`
9. every markdown file under `phases/` in numerical order

Then execute the project autonomously.

Important:
- The current repository checkout is the source of truth.
- Reuse OpenCode capabilities rather than duplicating them.
- Preserve arbitrary BYOK/custom endpoint/model support.
- Build a real IDE, not a mock.
- Build first-class Remote SSH / Remote Explorer.
- Make remote filesystem, terminal, Git, LSP and agent execution actually run on the remote Ubuntu workspace.
- Integrate OpenCode rewind/revert/fork with the chat timeline and editor safely.
- Never silently overwrite unsaved human edits.
- Never weaken SSH security.
- Never commit credentials.
- Keep the fork maintainable against upstream.

Proceed through all phases automatically.
Do not stop after Phase 00.
Do not ask for routine confirmation between phases.
Only stop for the hard blockers defined in `01_EXECUTION_PROTOCOL.md`.

After every phase:
- run lint/typecheck/tests/build as applicable
- fix phase-caused failures
- update docs
- update STATUS.md
- commit
- continue

Begin now with Phase 00.
