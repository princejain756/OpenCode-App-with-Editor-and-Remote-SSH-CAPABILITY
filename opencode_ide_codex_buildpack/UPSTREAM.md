# Upstream Maintenance Strategy

Target upstream:
`anomalyco/opencode`

## Principles

- Keep IDE additions modular.
- Avoid unrelated changes.
- Prefer new packages/modules over invasive rewrites.
- Maintain compatibility with upstream provider/session/tool APIs.
- Keep custom endpoint/BYOK behavior intact.

## Suggested update workflow

1. Add upstream remote if missing.
2. Fetch upstream.
3. Create a dedicated integration branch.
4. Merge or rebase according to repository convention.
5. Resolve conflicts with preference for upstream behavior unless it breaks our explicit IDE integration.
6. Run full tests.
7. Build desktop targets.
8. Run acceptance tests.
9. Merge integration branch into main fork branch.

## Areas likely to conflict

Codex should update this section after Phase 0 with actual package/file paths.

- Desktop shell/layout
- file explorer
- tabs
- session/timeline UI
- terminal panel
- workspace/project state
- provider/settings UI

## Never fork provider logic unnecessarily

Custom provider and arbitrary endpoint support is a core reason for using OpenCode. Preserve upstream improvements here whenever possible.
