# Upstream Maintenance Strategy

Target upstream: `anomalyco/opencode` (branch: `dev`)

## Upstream Integration Points

| Feature Area | Upstream Location | Integration Approach |
|---|---|---|
| **Editor Integration** | `packages/app/src/pages/session/file-tabs.tsx`, `packages/app/src/components/editor/` | Mount Monaco Editor component in place of static file viewer while preserving diff and review tabs. |
| **Buffer Management** | `packages/app/src/context/buffer/` (new module) | New isolated context module interfacing with `useFile` and `@parcel/watcher`. |
| **Server & Protocol** | `packages/protocol/src/groups/fs.ts`, `packages/opencode/src/server/routes/instance/httpapi/handlers/file.ts` | Add write/create/delete/rename/replace endpoints while preserving upstream Effect HTTP API schema. |
| **Remote SSH Explorer** | `packages/desktop/src/main/ssh/` (new module) & `packages/app/src/context/ssh/` | Modeled alongside `packages/desktop/src/main/wsl/` to manage remote connections cleanly. |
| **Timeline Rewind / Fork** | `packages/app/src/pages/session/timeline/` & `packages/app/src/pages/session/use-session-commands.tsx` | Enrich session message actions with restore & fork hooks that invoke existing snapshot APIs. |

## Suggested update workflow

1. Ensure upstream remote is tracked (`git remote add upstream https://github.com/anomalyco/opencode.git`).
2. Fetch upstream (`git fetch upstream`).
3. Merge or rebase updates onto `dev` branch.
4. Run `bun typecheck` in all package directories.
5. Run package unit tests (`bun --cwd packages/app test:unit`, `bun --cwd packages/opencode test`).
6. Run `bun --cwd packages/desktop build` to verify desktop bundle integrity.
