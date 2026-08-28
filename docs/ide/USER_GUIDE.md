# OpenCode IDE — User Guide

OpenCode is a standalone, AI-first Integrated Development Environment (IDE) with native local and Remote SSH development capabilities.

---

## 1. Code Editor & Multi-Pane Layout

- **Monaco Code Editor**: Powered by Monaco Editor 0.56.0 with full syntax highlighting for TypeScript, JavaScript, Python, Go, Rust, C/C++, HTML, CSS, JSON, Markdown, YAML, and Shell.
- **Split Editor Panes**: Split any editor horizontally or vertically via the split buttons in the top right. Work on multiple files simultaneously with independent scrolling, cursor state, and tab management.
- **Buffer Safety**: OpenCode protects unsaved human edits at all times. If external disk changes or agent modifications arrive while a file has unsaved changes, OpenCode flags a conflict with inline resolution options:
  - *Keep Editor Version*: Overwrites disk with your editor modifications.
  - *Reload From Disk*: Discards unsaved edits and syncs with disk.
  - *View Diff*: Opens a side-by-side Monaco diff comparing editor memory against disk.

---

## 2. Remote SSH & Remote Explorer

OpenCode provides first-class Remote SSH development. You can connect to any remote Linux/Ubuntu/Debian VPS or cloud server and develop seamlessly:

1. Open the **Remote Explorer** icon in the left sidebar.
2. OpenCode automatically discovers and displays all hosts defined in your local `~/.ssh/config` file (including HostName, User, Port, IdentityFile, and ProxyJump configurations).
3. Click **"+ Add SSH Host..."** or type a quick connect string (e.g. `ssh ubuntu@192.168.1.100 -p 22`) to connect.
4. Once connected, OpenCode creates a persistent encrypted SSH control tunnel. All file browsing, Monaco editor reading/saving, PTY terminals, Git operations, LSP servers, and AI agent executions run natively on the remote host.
5. A **Remote SSH Banner** at the top of the editor indicates the active host, tunnel port, and latency, with one-click actions to switch between local and remote workspaces.

---

## 3. AI Assistant & Diff Review

- **Real-Time Agent Reviews**: When the OpenCode AI edits files, changes are tracked in real-time. An inline **Agent Review Banner** appears above modified files showing added/removed line statistics with **"Accept"**, **"Reject"**, and **"Review Batch"** actions.
- **Batch Review Modal**: Inspect all multi-file agent modifications simultaneously with side-by-side diff viewers before committing changes to your working tree.
- **BYOK (Bring Your Own Key)**: Choose any AI provider (Anthropic Claude 3.7 Sonnet, OpenAI GPT-4o, Google Gemini 2.5 Flash, Ollama, OpenRouter, or custom OpenAI-compatible endpoints) without vendor lock-in.

---

## 4. Timeline Rewind, Unrevert & Branch Forking

- **Chat-Linked Checkpoints**: Every user prompt and assistant turn records an atomic workspace snapshot.
- **Rewind**: Revert the workspace and editor state back to any prior message in the chat timeline. OpenCode protects your open dirty buffers, prompting for confirmation before reverting disk state.
- **Unrevert**: Instantly restore the workspace back to the latest timeline head if you decide not to rewind.
- **Fork Session**: Branch off a new independent conversation and timeline branch from any intermediate checkpoint.

---

## 5. Source Control (Git UI)

- **Source Control Panel**: Full Git sidebar panel displaying working tree changes and staged files.
- **Staging & Discard**: Stage single files or all files (`git add`), unstage files (`git reset`), and discard unstaged changes with confirmation (`git restore`).
- **Commit**: Type a commit message and press `Cmd+Enter` / `Ctrl+Enter` or click **Commit** to create atomic Git commits.
- **Branch Management**: View current branch, switch branches, create new feature branches, and sync (`git pull` / `git push`) with remote repositories.

---

## 6. Run & Debug (DAP Engine)

- **Debug Adapter Protocol (DAP)**: Native debugging client supporting Node.js, Bun, Python (`debugpy`), and custom debuggers.
- **Breakpoints**: Click the Monaco editor gutter to toggle breakpoints. Breakpoints are stored per file and line with persistent state.
- **Floating Debug Toolbar**: Controls for Continue/Pause (F5/F6), Step Over (F10), Step Into (F11), Step Out (Shift+F11), Restart, and Stop (Shift+F5).
- **Inspector**: Real-time Call Stack navigation, Scopes & Variables tree inspection, and interactive Debug Console REPL.
