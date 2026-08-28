# Architecture Rules

## Core boundary

OpenCode remains the agent/model/session engine.

The IDE layer should own:
- editor UX
- workspace UX
- local/remote workspace abstraction
- SSH connection UX
- LSP client UX
- Git UX
- debugger UX
- terminal panel UX
- file buffer coordination
- agent/editor conflict handling

## Preferred conceptual architecture

Desktop Shell
├── Workspace Manager
│   ├── LocalWorkspace
│   └── RemoteWorkspace
├── Editor Service
├── Buffer Manager
├── File Explorer
├── Search
├── Git Service
├── Terminal Service
├── LSP Service
├── Debug Service
├── Remote Explorer
├── SSH Transport
├── OpenCode Client
└── Agent Timeline UI

## Workspace interface

Create a clean workspace abstraction rather than sprinkling remote checks everywhere.

Conceptual interface:

- readFile
- writeFile
- stat
- listDirectory
- createFile
- createDirectory
- rename
- delete
- watch
- search
- spawnProcess
- git
- openTerminal
- resolvePath
- workspaceRoot

Local and remote implementations should satisfy the same higher-level contract where practical.

## Remote design principle

Prefer:
Local Desktop
  -> SSH persistent connection/tunnel
  -> remote OpenCode/workspace service
  -> filesystem/process/LSP/Git on VPS

Avoid:
Local Desktop
  -> independent shelling out to ssh for each tiny operation

## Buffer safety

Manual unsaved edits and agent writes must never silently overwrite each other.

At minimum:
- track disk version
- track buffer version
- detect external modifications
- show conflict UI
- provide compare/merge/reload/keep options
- block destructive rewind if unsaved edits would be lost without explicit handling

## Snapshot integration

Do not create a second snapshot model unless needed.

Map OpenCode session messages/checkpoints into the IDE timeline.

The editor must understand when a revert changes files that are currently open.

After restore:
- refresh clean buffers
- mark conflicts for dirty buffers
- update Git state
- update diagnostics
- update file tree
- update diff/review panel

## Dependency rule

Prefer mature, maintained libraries.

Do not implement:
- SSH protocol
- terminal emulation
- Git object model
- LSP protocol
- DAP protocol

from scratch unless repository constraints make it unavoidable.
