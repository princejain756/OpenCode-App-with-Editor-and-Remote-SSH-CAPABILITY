# Architecture Decision Log

## ADR-001 — Editor Engine Selection: Monaco Editor
**Date:** 2026-08-29  
**Phase:** Phase 00 — Repository Audit  
**Status:** Accepted  

### Context
OpenCode Desktop requires a full-fledged IDE editor surface supporting editable tabs, syntax highlighting, multi-cursor, minimap, folding, search/replace, diff editing, and LSP protocol language features.

### Decision
Adopt Monaco Editor (`monaco-editor` / `@monaco-editor/loader`) within the Solid.js / Electron renderer, wrapping it in a reactive Solid.js component with clean model/buffer lifecycle management.

### Alternatives Considered
- CodeMirror 6: Lightweight and modular, but requires building many LSP UI bridges and diff view features from scratch.
- Custom textarea / web-tree-sitter: Far too primitive for a production IDE.

### Why
Monaco is the native core of VS Code, natively implements LSP data structures (completion, hover, markers, code actions), provides high-performance large-file rendering, and contains built-in diff editors and command palette hooks.

### Consequences
Requires Monaco web worker bundling in Vite/Electron build configuration and Solid.js lifecycle bridging.

---

## ADR-002 — Persistent SSH Tunnel with Remote OpenCode Sidecar
**Date:** 2026-08-29  
**Phase:** Phase 00 — Repository Audit  
**Status:** Accepted  

### Context
Remote development on Ubuntu VPS requires executing filesystem operations, PTY terminals, Git commands, LSP, and AI agent execution natively on the remote host without latency or fragmentation.

### Decision
Spawn the OpenCode server directly on the remote VPS over a persistent SSH connection with loopback port forwarding / authenticated UNIX socket, allowing the local Desktop frontend to communicate with the remote OpenCode instance using the standard OpenCode protocol.

### Alternatives Considered
- Shelling out one-off `ssh user@host <cmd>` per filesystem or Git action: High latency, fragile process state, cannot stream PTY or LSP efficiently.
- Custom ad-hoc SSH microservice: Duplicates OpenCode capabilities and violates the primary reuse rule.

### Why
Reuses OpenCode's entire server, session, tool execution, terminal PTY, and LSP infrastructure natively on the remote machine while maintaining strict security (loopback binding + SSH encryption).

### Consequences
Requires bootstrap logic on remote connect to ensure OpenCode runtime is present and running on the remote VPS.
