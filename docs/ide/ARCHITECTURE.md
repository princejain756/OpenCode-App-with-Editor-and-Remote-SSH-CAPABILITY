# OpenCode IDE Architecture Specification

## 1. System Overview

OpenCode IDE is a standalone AI-first development environment built upon the OpenCode agent, model routing, and session infrastructure.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          OpenCode Desktop (Electron)                   │
├────────────────────────────────┬───────────────────────────────────────┤
│         IDE Shell UI           │         Workspace / Services          │
│ ┌────────────────────────────┐ │ ┌───────────────────────────────────┐ │
│ │ Monaco Editor + Buffer Mgr │ │ │ BufferManager (disk vs memory)   │ │
│ │ Tabs / Breadcrumbs / Mini  │ │ │ LocalWorkspace / RemoteWorkspace  │ │
│ │ File Explorer (Local/SSH)  │ │ │ Search / Replace Service (Ripgrep)│ │
│ │ Integrated Terminal        │ │ │ Git Service (Local & Remote)      │ │
│ │ Diff Review & Checkpoints  │ │ │ LSP Client / Diagnostics Router   │ │
│ │ Remote Explorer (SSH)      │ │ │ Debug (DAP) Service Scaffolding   │ │
│ └────────────────────────────┘ │ └───────────────────────────────────┘ │
├────────────────────────────────┴───────────────────────────────────────┤
│                  OpenCode Core & Session Engine                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ - SessionV2 / Runner / Drains / Execution / Coalescing             │ │
│ │ - Multi-Provider BYOK / Dynamic Endpoints / Custom Headers         │ │
│ │ - Snapshot / Revert / Timeline / Fork                              │ │
│ │ - Tool Registry (Bash, Edit, Read, Write, Grep, MCP)               │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────┬───────────────────────────────────────┤
│ Local Workspaces (Local FS)    │ Remote Workspaces (SSH / Ubuntu VPS)  │
│ - Node/Bun FileSystem          │ - Persistent SSH Transport / Tunnel   │
│ - Local PTY / Ghostty Terminal │ - Remote OpenCode Server / Agent      │
│ - Local Ripgrep & Watchers     │ - Remote PTY, Remote FS, Remote LSP   │
└────────────────────────────────┴───────────────────────────────────────┘
```

---

## 2. Inventory of Existing Reusable Capabilities

| Capability | Location | Reusability Strategy |
|---|---|---|
| **AI Agent Loop & Execution** | `packages/core/src/session/` & `packages/opencode/src/session/` | Fully reuse. Keep durable input admission, continuation drains, provider allowances, and message projections. |
| **Model Providers & BYOK** | `packages/core/src/plugin/provider/` & `packages/app/src/context/models.tsx` | Fully reuse. Preserves OpenAI, Anthropic, OpenRouter, Vertex, Bedrock, Ollama, custom OpenAI-compatible endpoints with arbitrary URLs and keys. |
| **Snapshots, Revert & Fork** | `packages/core/src/session/revert.ts`, `packages/opencode/src/snapshot/`, `packages/app/src/components/dialog-fork.tsx` | Fully reuse backend snapshot store and lineage tracking; integrate into IDE buffer and timeline synchronization. |
| **Integrated Terminal** | `packages/app/src/context/terminal.tsx`, `packages/app/src/components/terminal.tsx`, `ghostty-web` | Fully reuse terminal rendering with Ghostty Web WASM and PTY backend; extend with remote SSH PTY. |
| **Ripgrep & Search** | `packages/core/src/ripgrep.ts`, `packages/core/src/filesystem/search.ts` | Fully reuse ripgrep wrappers for fast workspace-wide search and replace. |
| **File Watcher & Caching** | `@parcel/watcher`, `packages/app/src/context/file/watcher.ts` | Reuse and integrate with Buffer Manager for conflict detection. |
| **Multi-Server / Remote Model** | `packages/desktop/src/main/wsl/servers.ts`, `packages/app/src/context/server.tsx` | Extend pattern for SSH Remote Explorer and remote OpenCode sidecar connectivity. |
| **LSP Infrastructure** | `packages/opencode/src/lsp/` | Reuse existing LSP client/server management for local & remote language intelligence. |

---

## 3. Missing Capabilities to Implement

1. **Production-Grade Code Editor (Monaco Editor)**
   - Editable tabs, cursor state, dirty tracking, syntax highlighting, code folding, minimap toggle, breadcrumbs, multi-cursor, find/replace.
2. **Buffer Manager & Conflict Engine**
   - Disk version vs buffer version tracking.
   - Detect external disk modifications / agent modifications while buffer is dirty.
   - Conflict resolution UI (Reload from Disk, Keep Buffer, Diff View).
3. **Workspace File Operations**
   - File creation, folder creation, rename, delete (with safety confirmation), Save As.
4. **Agent + Editor Live Synchronization**
   - Live diff view, review panel with hunk/file acceptance, dirty buffer protection against agent overwrites.
5. **Timeline / Rewind / Fork UX**
   - Chat checkpoint restore synchronizing editor buffers, disk state, Git status, and explorer without silent data loss.
6. **Remote Explorer (SSH)**
   - Parsing `~/.ssh/config`, host aliases, identity files, ssh-agent, password/passphrase prompt handling, known_hosts validation, fingerprint checking.
7. **Remote Workspace & Filesystem Services**
   - Persistent SSH transport (tunneling JSON-RPC / HTTP API to remote OpenCode process).
   - Remote FS operations, remote watchers, remote terminals, remote Git, remote LSP.
8. **DAP Debugging Architecture**
   - Debug configuration schema, launch/attach controls, breakpoints, stack frames, variables inspector, debug console.

---

## 4. Editor Choice: Monaco Editor

- **Selection**: Monaco Editor (`monaco-editor`)
- **Rationale**:
  - Gold standard for web/desktop IDE experiences.
  - Native LSP protocol alignment (diagnostics, hover, completion, definitions, formatting).
  - Rich editing features: multi-cursor, minimap, folding, bracket matching, diff editor, find/replace.
  - Compatible with Solid.js renderer and Electron environment.

---

## 5. Local & Remote Workspace Abstraction

All IDE interactions interface through a unified `Workspace` interface:

```typescript
export interface WorkspaceService {
  readonly id: string
  readonly isRemote: boolean
  readonly rootPath: string
  
  // Filesystem
  readFile(path: string): Promise<Uint8Array>
  readFileString(path: string): Promise<string>
  writeFile(path: string, content: Uint8Array | string): Promise<void>
  createFile(path: string, initialContent?: string): Promise<void>
  createDirectory(path: string): Promise<void>
  deletePath(path: string, recursive?: boolean): Promise<void>
  renamePath(oldPath: string, newPath: string): Promise<void>
  stat(path: string): Promise<FileStat>
  listDirectory(path: string): Promise<FileEntry[]>
  
  // Search
  search(query: SearchQuery): Promise<SearchResult[]>
  replace(query: ReplaceQuery): Promise<ReplaceResult>
  
  // Terminal
  spawnPty(options: PtyOptions): Promise<PtyHandle>
  
  // Git
  gitStatus(): Promise<GitStatusResult>
  gitDiff(path?: string): Promise<string>
  gitStage(paths: string[]): Promise<void>
  gitUnstage(paths: string[]): Promise<void>
  gitCommit(message: string): Promise<void>
  gitCheckout(target: string): Promise<void>
  
  // LSP
  startLanguageServer(languageId: string): Promise<LspConnection>
}
```

---

## 6. Remote SSH Architecture

```
Desktop App (Electron Main)
  │
  ├─ SSH Client (node-ssh / ssh2 with native OpenSSH config parsing)
  │   ├── Reads ~/.ssh/config & ~/.ssh/known_hosts
  │   ├── Authenticates via SSH Agent, Private Keys, or Password
  │   └── Verifies host fingerprint strictly
  │
  └─ Persistent SSH Tunnel (Loopback on Remote)
      │
      ├── Remote OpenCode Server Process on Ubuntu VPS (spawned on localhost)
      ├── Reverse/Direct Port Forwarding over SSH Channel
      └── Electron / App communicates with remote OpenCode Server via authenticated HTTP / WebSocket
```

- **Security & Safety**:
  - Strictly bound to loopback `127.0.0.1` on the VPS.
  - No secrets logged or written to storage.
  - Unauthenticated remote connections rejected.
  - Automatic reconnection and state recovery.

---

## 7. Buffer Safety & Snapshot Synchronization

```
                  ┌──────────────────────────────┐
                  │        Buffer Manager        │
                  ├──────────────────────────────┤
                  │ - diskVersion                │
                  │ - bufferVersion              │
                  │ - dirty flag                 │
                  └──────────────┬───────────────┘
                                 │
         ┌───────────────────────┴───────────────────────┐
         ▼                                               ▼
┌──────────────────┐                           ┌──────────────────┐
│  User Edit (UI)  │                           │ Agent/Disk Event │
├──────────────────┤                           ├──────────────────┤
│ Marks buffer as  │                           │ If clean: reload │
│ dirty, updates   │                           │ If dirty: trigger│
│ bufferVersion    │                           │ conflict modal   │
└──────────────────┘                           └──────────────────┘
```

When Rewind/Restore is triggered:
1. Dirty buffers are checked. If unsaved human edits exist, a conflict prompt gives options: Keep Edits, Discard & Rewind, or Compare.
2. Snapshot is restored on disk via OpenCode snapshot engine.
3. Clean buffers reload automatically.
4. Git state, file tree, diagnostics, and review panels refresh instantly.
