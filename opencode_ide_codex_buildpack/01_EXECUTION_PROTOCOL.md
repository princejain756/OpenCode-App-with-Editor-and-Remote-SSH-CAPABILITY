# Codex Autonomous Execution Protocol

## Mission

Implement the complete specification by progressing through every phase in `phases/` without requiring routine user interaction.

## Required operating loop

For each phase:

1. Read the phase file completely.
2. Inspect the relevant current repository code.
3. Update `STATUS.md` with:
   - phase started
   - intended scope
   - key files/components
4. Implement the smallest coherent production-grade slice.
5. Run:
   - formatter if repository uses one
   - lint
   - typecheck
   - focused tests
   - broader tests where practical
   - desktop build
6. Fix failures caused by the phase.
7. Add/adjust tests.
8. Update docs.
9. Update `DECISIONS.md` for non-trivial architecture decisions.
10. Update `STATUS.md` with completed work and remaining issues.
11. Commit with a clean phase-oriented commit message.
12. Continue to the next phase automatically.

## Do not stop for ordinary uncertainty

If two implementations are both reasonable:
- choose the more reversible one,
- document the decision,
- continue.

If a feature depends on an optional subsystem:
- create a clean interface,
- implement the working default path,
- leave extension points,
- continue.

## Stop only for a hard blocker

A hard blocker is one of:
- required credential/secret unavailable
- destructive action needing explicit approval
- paid external infrastructure required
- repository cannot build before changes and no local workaround exists
- upstream architecture fundamentally contradicts the requested behavior
- licensing issue prevents implementation
- platform-specific behavior cannot be validated without inaccessible hardware/service

When blocked:
1. Record in `BLOCKERS.md`
2. Continue every other independent phase possible
3. Do not abandon the whole build because one optional path is blocked

## Never fake completion

Do not:
- create non-functional buttons
- mark placeholder UI as implemented
- claim SSH works without integration validation
- claim remote LSP works if only local LSP was tested
- claim rewind is safe if unsaved-buffer conflicts remain unresolved
- silently disable security checks

## Repository truth rule

Always inspect the current checkout before implementing.
Existing OpenCode functionality takes priority over assumptions in this pack.

If upstream already implements a requested feature:
- reuse it
- integrate it
- test it
- do not duplicate it
