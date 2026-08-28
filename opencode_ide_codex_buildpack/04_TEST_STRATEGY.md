# Test Strategy

## General

Every phase must add tests at the appropriate level:
- unit
- integration
- end-to-end

Do not rely only on mocks for remote functionality.

## Required local tests

### Editor
- open file
- edit
- save
- dirty state
- external disk change
- conflict handling
- multiple tabs
- rename/delete currently open file

### Agent integration
- agent edits unopened file
- agent edits open clean file
- agent edits open dirty file
- review diff
- revert checkpoint
- redo/unrevert
- fork session
- restore updates explorer/editor/Git

### Terminal
- create terminal
- execute
- resize
- multiple terminals
- cwd
- kill/restart

### Git
- status
- stage
- unstage
- commit
- branch
- diff
- discard confirmation

## Required remote integration fixture

Create or document a repeatable Ubuntu SSH test target.

Prefer:
- disposable local VM/container with SSH server for CI where possible
- real Ubuntu VPS validation before declaring production-ready

Test:
- parse ~/.ssh/config
- connect
- fingerprint validation
- open remote folder
- list files
- read/write
- watch
- remote terminal
- remote Git
- remote search
- remote OpenCode agent edit
- remote test execution
- reconnect
- abrupt disconnect
- resume without corruption

## LSP tests
At minimum validate one mainstream stack, e.g. TypeScript:
- completion
- diagnostics
- go to definition
- rename
- remote LSP

## Packaging
Verify:
- macOS build
- Windows build
- Linux build

Where hardware/CI prevents executing all packages, at minimum ensure compile/package pipelines remain structurally valid and document unverified runtime paths.

## Acceptance tests

Keep an executable or clearly repeatable acceptance checklist mirroring `00_MASTER_SPEC.md`.
