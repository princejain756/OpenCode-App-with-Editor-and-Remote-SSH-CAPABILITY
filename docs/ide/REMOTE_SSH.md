# OpenCode IDE — Remote SSH Development Architecture

OpenCode provides native, end-to-end Remote SSH development directly into remote Linux (Ubuntu / Debian / RHEL / Arch) virtual machines, cloud instances (AWS EC2, GCP Compute Engine, Azure VMs, DigitalOcean Droplets), and on-prem servers.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Local Machine                      │
│                                                         │
│  ┌──────────────────┐            ┌───────────────────┐  │
│  │ Monaco Editor UI │            │  Remote Explorer  │  │
│  └────────┬─────────┘            └─────────┬─────────┘  │
│           │                                │            │
│  ┌────────▼────────────────────────────────▼─────────┐  │
│  │         SSHManager / Persistent SSH Tunnel        │  │
│  │         (ControlMaster / Local Port Forward)      │  │
│  │               127.0.0.1:<localPort>               │  │
│  └────────────────────────┬──────────────────────────┘  │
└───────────────────────────┼─────────────────────────────┘
                            │ Encrypted SSH Tunnel
                            │ (Port 22 / ProxyJump)
┌───────────────────────────┼─────────────────────────────┐
│                           │                             │
│  ┌────────────────────────▼──────────────────────────┐  │
│  │              OpenCode Remote Agent / Server       │  │
│  │               (127.0.0.1:4096 Loopback)           │  │
│  └────────┬───────────┬────────────┬─────────────┬───┘  │
│           │           │            │             │      │
│     ┌─────▼─────┐ ┌───▼───┐   ┌────▼────┐   ┌────▼───┐  │
│     │ Filesystem│ │ Bash  │   │  Linux  │   │  Linux │  │
│     │   Tree    │ │  PTY  │   │   Git   │   │   LSP  │  │
│     └───────────┘ └───────┘   └─────────┘   └────────┘  │
│                                                         │
│                   Remote Linux Server                   │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Key Capabilities

1. **Native OpenSSH ControlMaster Multiplexing**:
   - Connections reuse persistent control sockets stored under `~/.opencode/ssh-sockets/` with `ControlPersist=10m`.
   - No overhead of reconnecting or re-authenticating for every file read or command execution.
   - Transparent support for `~/.ssh/config` aliases, `ProxyJump`, `IdentityFile`, and SSH Agent forwarding.

2. **Security & Zero Public Exposure**:
   - The remote OpenCode server strictly binds to `127.0.0.1:4096` on the remote host (loopback only).
   - No firewall ports or public IP exposure required. All communication flows through the authenticated, encrypted SSH tunnel.

3. **Remote Filesystem & File Streaming**:
   - Remote directories browse directly in the file tree.
   - File reads, writes, creations, renames, and deletions execute natively on the remote Linux disk.
   - Buffer conflict detection prevents accidental overwrites when remote background tasks edit files.

4. **Remote Interactive Terminals**:
   - PTY terminals spawn remote shells (`/bin/bash`, `/bin/zsh`) on the Ubuntu server.
   - Full ANSI colors, cursor positioning, and terminal resizing.

5. **Remote AI Agent Execution**:
   - The OpenCode agent executes commands, runs project tools, compiles binaries, runs Python/Node tests, and interacts with Docker natively inside the remote environment.
   - Local BYOK API keys (OpenAI, Anthropic, Gemini) are propagated to the session securely without saving keys to the remote disk.

6. **Remote LSP & Git**:
   - Language servers (`typescript-language-server`, `pyright`, `gopls`, `rust-analyzer`) run on the remote machine with access to remote dependencies.
   - System `git` commands execute in the remote repository root.
