# OpenCode IDE Implementation Roadmap

## Overview of Phases

| Phase | Description | Key Modules / Output |
|---|---|---|
| **Phase 00** | Repository Audit & Architecture | Baseline verification, docs (`ARCHITECTURE.md`, `ROADMAP.md`, `DECISIONS.md`, `STATUS.md`, `UPSTREAM.md`). |
| **Phase 01** | Editable Local Editor | Monaco Editor integration, tab manager, dirty tracking, save/save as, file operations (create, rename, delete). |
| **Phase 02** | Buffers, Tabs, Search, Watchers | Centralized Buffer Manager, disk vs buffer versioning, external change watcher, conflict resolution UI, workspace search & replace. |
| **Phase 03** | LSP / IntelliSense | LSP client integration with Monaco (completion, diagnostics, hover, definition, rename, formatting) for TypeScript and mainstream languages. |
| **Phase 04** | Agent + Editor + Diff Integration | Live agent diff inspection, file-level & hunk-level review, conflict prevention on dirty buffers during agent turns. |
| **Phase 05** | Rewind / Restore / Fork Timeline | Visual checkpoint timeline on chat messages, restore synchronization with editor/disk/git, session forking. |
| **Phase 06** | Remote SSH / Remote Explorer | SSH host manager, `~/.ssh/config` parsing, key/agent/passphrase auth, fingerprint verification, Remote Explorer tree. |
| **Phase 07** | Remote Filesystem + Remote Terminal | Remote workspace abstraction over SSH, remote file tree, remote buffer editing/saving, remote PTY terminal streaming. |
| **Phase 08** | Remote OpenCode Agent | Remote execution of OpenCode backend & agent tools on Ubuntu VPS; remote file reads/writes, bash commands, and test running. |
| **Phase 09** | Remote LSP + Git | Remote language server execution routed to local Monaco Editor; remote Git operations via system Git on VPS. |
| **Phase 10** | Debugging / DAP | DAP architecture and client UI (launch config, breakpoints, call stack, variables, step controls, debug console). |
| **Phase 11** | Packaging, Hardening & Acceptance | End-to-end acceptance run across all 18 criteria, cross-platform build validation, comprehensive user guides & documentation. |
