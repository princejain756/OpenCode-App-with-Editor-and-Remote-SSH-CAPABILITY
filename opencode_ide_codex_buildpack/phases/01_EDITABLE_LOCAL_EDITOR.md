# Phase 01 — Editable Local Editor

## Goal
Turn current file viewing into a real editable IDE surface.

## Required
- production-grade editor component
- open files from explorer
- editable tabs
- save
- save as where appropriate
- Ctrl/Cmd+S
- dirty indicator
- file create
- folder create
- rename
- delete
- basic editor settings
- syntax highlighting
- line numbers
- folding
- find/replace
- multi-cursor if editor supports it
- breadcrumbs if practical

## Rules
- integrate with existing OpenCode file explorer
- do not duplicate workspace state unnecessarily
- establish buffer manager now
- preserve current review/diff functionality

## Tests
- open/edit/save
- dirty state
- close dirty file prompt
- rename open file
- delete open file
- multi-tab persistence

## Exit criteria
A user can comfortably write code locally without another editor.
