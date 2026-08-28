# Phase 02 — Buffers, Tabs, Search, Watchers

## Goal
Make editing reliable enough for AI + manual concurrent workflows.

## Required
- centralized buffer/version model
- external filesystem watcher integration
- detect external file changes
- conflict resolution UI
- reload/keep/compare behavior
- workspace search
- workspace replace
- tab persistence where appropriate
- split editor if architecture permits cleanly
- command palette
- core keyboard shortcuts
- minimap toggle
- editor settings persistence

## Critical scenario
Manual dirty buffer + agent/external disk write must never silently lose work.

## Tests
- external modification to clean buffer
- external modification to dirty buffer
- file deletion externally
- mass agent write while files open
- search/replace across workspace

## Exit criteria
Buffer semantics are explicitly safe and documented.
