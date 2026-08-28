# Phase 07 — Remote Filesystem + Remote Terminal

## Goal
Make a remote folder feel like a normal workspace.

## Required
- choose/open remote folder
- remote explorer tree
- remote read/write
- create/rename/delete
- watchers
- search
- remote editor save
- multiple remote terminals
- remote cwd
- terminal reconnect behavior
- graceful SSH loss

## Architecture
Use persistent remote workspace transport/service.

## Tests
- open /tmp fixture project remotely
- edit/save
- file watcher
- search
- terminal command
- disconnect during idle
- reconnect
- disconnect during file activity without corruption

## Exit criteria
Remote filesystem and terminal workflows are stable.
