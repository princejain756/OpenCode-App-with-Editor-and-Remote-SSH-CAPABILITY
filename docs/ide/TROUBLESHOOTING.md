# OpenCode IDE — Troubleshooting & Recovery Guide

This guide covers common troubleshooting scenarios and recovery procedures.

---

## 1. Remote SSH Connection Issues

### Problem: SSH connection times out or fails to authenticate
- **Verify SSH Keys**: Ensure your private key has correct permissions (`chmod 600 ~/.ssh/id_ed25519`).
- **Test via CLI**: Run `ssh -v user@hostname` from terminal to inspect handshake errors.
- **Check ProxyJump**: If using a bastion host, verify you can connect through the jump host directly.
- **Inspect Control Sockets**: If connection states are stale, remove old sockets via `rm -rf ~/.opencode/ssh-sockets/*`.

### Problem: SSH disconnects during development
- OpenCode automatically displays the **Remote SSH Reconnecting Banner** and attempts automatic tunnel restoration.
- Unsaved editor buffers are preserved in memory and are never discarded during connection drops.

---

## 2. Editor Buffer & File Conflicts

### Problem: "File modified externally" conflict banner appears
- OpenCode protects your unsaved human changes.
- Click **"View Diff"** to inspect differences between memory and disk.
- Click **"Keep Editor Version"** to force-save your changes to disk, or **"Reload From Disk"** to sync with disk.

---

## 3. LSP & IntelliSense

### Problem: Diagnostics or autocomplete not appearing for a language
- Verify the language server binary is installed (e.g. `npm i -g typescript-language-server` or `pip install pyright`).
- For remote workspaces, ensure the language server is installed on the remote Linux host.
- Trigger **"Restart LSP"** via the Problems panel or Command Palette.

---

## 4. Debug Adapter Protocol (DAP)

### Problem: Debugger fails to attach
- Ensure the debuggee process has inspector flags enabled (e.g. `node --inspect=9229 app.js` or `python -m debugpy --listen 5678 app.py`).
- Check firewall settings if debugging remote processes over custom ports.
