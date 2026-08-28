# Security Rules

## SSH

Never:
- disable strict host checking silently
- auto-accept changed host fingerprints
- store private keys in app DB
- log passwords
- log private key content
- expose OpenCode remote ports publicly by default

Prefer:
- OpenSSH config compatibility
- system ssh-agent
- OS keychain/credential manager for passwords if needed
- known_hosts validation
- explicit fingerprint confirmation
- SSH tunneling for remote services

## Secrets

Never commit:
- API keys
- SSH keys
- passwords
- bearer tokens
- test production credentials

Use:
- environment variables
- OS credential stores
- existing OpenCode secret/provider mechanisms

## Remote service

If a remote helper/server is used:
- bind to loopback by default
- tunnel over SSH
- authenticate connections
- version handshake
- restrict operations to the intended workspace/session where feasible
- validate paths
- avoid arbitrary unauthenticated remote APIs

## File operations

Protect against:
- path traversal
- accidental workspace escape
- symlink surprises
- deletion without confirmation
- race conditions during disconnects

## Agent permissions

Preserve OpenCode permission prompts/policies.
Remote mode must not weaken them.

## Logging

Redact:
- API keys
- Authorization headers
- passwords
- private key material
- sensitive env values

Add tests for redaction where practical.
