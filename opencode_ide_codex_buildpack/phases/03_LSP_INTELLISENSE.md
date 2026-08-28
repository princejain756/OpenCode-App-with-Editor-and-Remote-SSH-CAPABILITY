# Phase 03 — LSP / IntelliSense

## Goal
Provide IDE-grade language intelligence.

## Required
Implement client/service architecture for:
- diagnostics
- completion
- hover
- definition
- references
- rename
- symbols
- formatting
- code actions
- signature help

Reuse current OpenCode LSP capability if it exists and is suitable.

## First validated language
Prefer TypeScript/JavaScript unless repository context suggests a better first target.

## UI
- Problems panel
- inline diagnostics
- hover UI
- completion popup
- navigation

## Tests
Use a deterministic fixture project.

## Exit criteria
Local coding experience is materially comparable to a normal IDE.
