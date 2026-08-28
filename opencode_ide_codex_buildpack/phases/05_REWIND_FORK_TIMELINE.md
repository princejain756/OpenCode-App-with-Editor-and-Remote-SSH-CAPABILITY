# Phase 05 — Rewind / Restore / Fork Timeline UX

## Goal
Expose OpenCode session state as an intuitive chat-linked code timeline.

## Required
For eligible messages/checkpoints:
- Restore/Rewind
- View Diff
- Fork
- Redo/Unrevert if backend supports it

## Behavior
Restoring must synchronize:
- filesystem
- editor buffers
- explorer
- Git status
- diagnostics
- review panel

## Dirty buffer safety
Never discard unsaved user edits without explicit conflict handling.

## UX
The user should understand exactly which code state they are returning to.

## Tests
Create 5 sequential agent changes.
Restore to an earlier checkpoint.
Verify later file changes disappear as expected.
Fork from earlier state.
Continue independently.
Redo/unrevert where supported.

## Exit criteria
The workflow meaningfully matches the user's desired Cursor/Antigravity-style history model.
