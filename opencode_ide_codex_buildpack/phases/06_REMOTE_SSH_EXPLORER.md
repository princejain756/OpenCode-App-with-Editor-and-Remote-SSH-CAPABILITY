# Phase 06 — Remote SSH / Remote Explorer

## Goal
Create first-class SSH host management.

## UI
REMOTE EXPLORER
SSH
├── saved hosts
└── Add SSH Host...

## Required
- parse ~/.ssh/config
- aliases
- host/user/port
- key auth
- ssh-agent
- passphrase keys
- safe password auth if supported
- known_hosts
- fingerprint confirmation
- ProxyJump if practical
- connect/reconnect/disconnect
- connection status
- recent hosts

## Architecture
Persistent SSH connection.
Do not issue unrelated one-off ssh commands for every operation.

## Security
Follow `03_SECURITY_RULES.md`.

## Tests
Use a disposable SSH test target where possible.

## Exit criteria
User can connect to an Ubuntu SSH host from Remote Explorer safely.
