# Buffer Safety, Concurrency & Conflict Engine

## 1. Overview
OpenCode IDE provides an active buffer management system (`BufferProvider`) that guarantees human edits are never silently overwritten or discarded by background operations, terminal build steps, git checkouts, or autonomous AI agent turns.

```
┌─────────────────────────────────────────────────────────────┐
│                    Editor Buffer Engine                     │
│                                                             │
│   ┌────────────────┐      (edit)       ┌────────────────┐   │
│   │  Disk Content  │ ───────────────>  │ Buffer Content │   │
│   │ (diskVersion)  │                   │ (bufferVersion)│   │
│   └────────┬───────┘                   └────────┬───────┘   │
│            │                                    │           │
│   Watcher  │ (external modification)            │ Save      │
│   Update   ▼                                    ▼           │
│     ┌──────────────┐                   ┌────────────────┐   │
│     │ Conflict?    │ ──(Dirty=true)─>  │ Conflict State │   │
│     │              │                   │ [Keep / Reload │   │
│     │              │ ──(Dirty=false)─> │  / Compare]    │   │
│     └──────────────┘   (Auto-Reload)   └────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 2. In-Memory State Model
Each active buffer maintains:
- `path`: Normalized relative workspace path.
- `content`: The current string in the Monaco Editor.
- `diskContent`: The snapshot of the file when last read from or saved to disk.
- `diskVersion`: Monotonically incrementing integer tracking file mutations on disk.
- `bufferVersion`: Monotonically incrementing integer tracking in-memory edits.
- `isDirty`: Boolean indicating whether `content !== diskContent`.
- `hasConflict`: Boolean indicating an external modification occurred while `isDirty === true`.
- `conflictContent`: The newly read disk content when a conflict is detected.

## 3. Concurrency Behaviors

### Case A: Clean Buffer Modified Externally (e.g. Agent Writes File)
- `isDirty === false`.
- Watcher receives `file.watcher.updated`.
- Buffer engine reads disk content.
- Buffer `content` and `diskContent` are updated atomically.
- Monaco Editor model updates without conflict banner.

### Case B: Dirty Buffer Modified Externally (Human Edits Concurrent with Agent)
- `isDirty === true` (`content !== diskContent`).
- Watcher receives `file.watcher.updated`.
- Buffer engine reads disk content into `conflictContent`.
- `hasConflict` is set to `true`.
- **HUMAN EDITS ARE NEVER OVERWRITTEN.**
- Conflict banner displays three actions:
  1. **Keep My Edits**: Dismisses banner, preserves local editor content, marks ready to overwrite on next manual save.
  2. **Reload from Disk**: Replaces editor content with `conflictContent`, clears dirty status and conflict flag.
  3. **Compare Diff**: Opens the side-by-side Monaco Diff Viewer comparing the disk version with the local unsaved buffer.

### Case C: Manual Save (`Cmd+S` / `Ctrl+S` / Save All)
- Flushes buffer `content` to server endpoint `/file/write`.
- Sets `diskContent = content`, `isDirty = false`, `hasConflict = false`.
- Increments `diskVersion`.

## 4. Workspace Search & Replace
- **Search**: Executes high-performance ripgrep queries with configurable case sensitivity, regex patterns, whole-word matching, and include/exclude globs.
- **Replace**: Safe server-side transactional replacement across files that preserves directory structures, triggers workspace watchers, and refreshes in-memory buffers automatically.
