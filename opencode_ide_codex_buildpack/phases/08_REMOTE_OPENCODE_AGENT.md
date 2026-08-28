# Phase 08 — Remote OpenCode Agent

## Goal
Ensure OpenCode agent actually operates in the remote environment.

## Required
When remote workspace active:
- agent file reads are remote
- agent file writes are remote
- shell commands run remotely
- project tools run remotely
- builds/tests run remotely
- Docker commands run remotely
- session workspace path is remote
- snapshots/revert correspond to remote project

## Preferred design
Run OpenCode backend/agent in remote environment and tunnel/control it securely over SSH if current OpenCode architecture supports this cleanly.

Do not expose remote service publicly.

## Tests
Ask agent to:
- edit remote file
- run npm/python test
- run git status
- run docker version if available
- create multi-file change
- revert

## Exit criteria
The AI behaves as if it is natively running inside the VPS project.
