# Phase 04 — Agent + Editor + Diff Integration

## Goal
Make OpenCode agent edits coexist safely with the editor.

## Required
- editor observes agent file changes
- modified files visually marked
- diff/review panel
- original vs changed
- file-level review
- hunk-level accept/reject if supported cleanly
- Accept All / Reject All where appropriate
- no silent destruction of dirty buffers
- clear conflict handling

## Reuse
Use existing OpenCode diff/review/session APIs.

## Tests
- agent edit unopened file
- agent edit open clean file
- agent edit open dirty file
- multi-file agent change
- reject changes
- accept changes
- subsequent manual edit

## Exit criteria
Agent + human editing is safe and understandable.
