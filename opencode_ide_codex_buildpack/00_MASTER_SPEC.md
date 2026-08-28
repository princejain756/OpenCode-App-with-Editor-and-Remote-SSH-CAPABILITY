# Master Product Specification

## Product goal

Transform the current OpenCode Desktop application into a complete AI-first IDE while preserving OpenCode as the AI/agent foundation.

The finished product should feel like:

**Cursor-quality editor + Antigravity-style Remote Explorer + OpenCode BYOK + OpenCode session/revert/fork architecture**

## Non-negotiable user requirements

### Full IDE
Must include:
- file explorer
- editable code tabs
- multiple open files
- dirty indicators
- save / save as
- file/folder create/rename/delete/move
- workspace search/replace
- syntax highlighting
- code folding
- bracket matching
- multi-cursor
- line numbers
- minimap toggle
- breadcrumbs
- command palette
- keyboard shortcuts
- split editor if practical
- integrated terminal
- Git/source control
- problems/diagnostics panel
- diff/review experience

Prefer Monaco Editor unless repository constraints make another production-grade editor clearly superior.

Do not use a textarea or toy editor.

### Language intelligence
Use LSP architecture where practical.

Required:
- diagnostics
- completion
- hover
- go to definition
- find references
- rename symbol
- symbols
- formatting
- code actions
- signature help

For remote workspaces, language servers must run remotely.

### OpenCode AI engine
Preserve:
- arbitrary providers
- arbitrary base URL/endpoints
- arbitrary model IDs
- API keys
- custom headers/body where supported
- OpenAI-compatible
- Anthropic-compatible
- local/self-hosted models
- OpenRouter
- MCP
- agents/subagents
- tools
- permissions
- context
- sessions
- compaction
- terminal/file tools
- diff/review
- snapshots/revert/fork

Do not hard-code any vendor.

### Chat + code timeline
The UI must expose chat-linked restore/revert behavior.

Conceptual example:

Prompt 1
Prompt 2
Prompt 3
Prompt 4
Prompt 5

Restoring to the checkpoint associated with Prompt 2 must restore the corresponding AI-managed workspace state.

Required:
- Restore/Rewind
- Fork
- Redo/Unrevert if supported
- View Diff
- clear limitation messaging for irreversible external side effects

Reuse OpenCode snapshot/session APIs rather than inventing a second state system unless strictly necessary.

### Remote Explorer / SSH
Must include a first-class Remote Explorer similar to VS Code Remote SSH / Antigravity.

Example:

REMOTE EXPLORER
SSH
├── production
├── staging
├── my-ec2-instance
├── hostinger-vps
└── Add SSH Host...

Support:
- ~/.ssh/config
- host aliases
- hostname
- username
- port
- private keys
- ssh-agent
- passphrase-protected keys
- password auth where safely supported
- known_hosts
- fingerprint verification
- ProxyJump where practical
- reconnect
- disconnect
- connection status

Do not silently weaken SSH verification.
Do not store private keys in app storage.
Never log secrets.

### Remote workspace behavior
When connected remotely, these must operate on the remote machine:
- filesystem
- explorer
- editor saves
- search
- watchers
- terminal
- Git
- LSP
- agent tools
- builds/tests
- Docker
- workspace OpenCode session

Do not implement remote development by launching one-off `ssh host command` calls for every action.

Prefer a persistent remote architecture.

### Git
Required:
- current branch
- status
- modified/untracked/staged
- diff
- stage/unstage
- commit
- checkout/create branch
- fetch
- pull
- push
- discard with confirmation

Remote Git must run remotely.

### Debugging
Prefer DAP architecture.
If full debugging is too large for the initial build, implement a clean integration boundary and complete a useful first debugger path for at least one mainstream runtime.

### Cross-platform
Desktop targets:
- macOS
- Windows
- Linux

Remote target priority:
- Ubuntu/Debian VPS

## Upstream compatibility
Keep the fork maintainable.

Prefer:
- new modules
- clean interfaces
- small integration points
- minimal unrelated rewrites

Maintain `UPSTREAM.md` with update/merge instructions.

## Final acceptance
A real acceptance test must prove:

1. Open local project.
2. Edit/save file manually.
3. Ask agent to modify project.
4. Review diff.
5. Revert to earlier agent checkpoint.
6. Fork conversation.
7. Configure a custom OpenAI-compatible endpoint.
8. Use arbitrary model ID.
9. Add SSH host.
10. Connect to Ubuntu VPS.
11. Open remote folder.
12. Edit remote file.
13. Run remote terminal command.
14. Run remote Git status.
15. Ask agent to modify remote file.
16. Run remote tests.
17. Confirm LSP works remotely.
18. Disconnect/reconnect without corruption.
