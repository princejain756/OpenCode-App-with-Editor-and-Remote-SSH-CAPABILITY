import { createSignal, For, Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Button } from "@opencode-ai/ui/button"
import { useGit, type GitFileChange } from "@/context/git"
import { useBuffer } from "@/context/buffer"

export function SourceControlPanel(props: { onClose?: () => void }) {
  const git = useGit()
  const buffer = useBuffer()

  const [commitMessage, setCommitMessage] = createSignal("")
  const [newBranchInput, setNewBranchInput] = createSignal("")
  const [showBranchDropdown, setShowBranchDropdown] = createSignal(false)

  const handleCommit = async () => {
    const msg = commitMessage().trim()
    if (!msg) return
    const ok = await git.commit(msg)
    if (ok) {
      setCommitMessage("")
    }
  }

  const handleKeydown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      void handleCommit()
    }
  }

  const handleCreateBranch = async (e: Event) => {
    e.preventDefault()
    const b = newBranchInput().trim()
    if (!b) return
    await git.checkout(b, true)
    setNewBranchInput("")
    setShowBranchDropdown(false)
  }

  return (
    <div class="flex flex-col h-full w-full bg-surface-base border-r border-border-base select-none">
      {/* Header */}
      <div class="flex items-center justify-between px-3 py-2 border-b border-border-base bg-surface-raised/50">
        <div class="flex items-center gap-2">
          <Icon name="branch" class="size-4 text-text-muted" />
          <span class="text-xs font-semibold text-text-strong uppercase tracking-wider">Source Control</span>
        </div>
        <div class="flex items-center gap-1">
          <IconButton
            icon="arrow-undo-down"
            variant="ghost"
            class="size-5"
            onClick={() => void git.fetchStatus()}
            title="Refresh Git Status"
          />
          <Show when={props.onClose}>
            <IconButton icon="close-small" variant="ghost" class="size-5" onClick={props.onClose} />
          </Show>
        </div>
      </div>

      {/* Branch & Sync Bar */}
      <div class="p-2 border-b border-border-base bg-surface-raised/20 space-y-2">
        <div class="flex items-center justify-between">
          <div class="relative">
            <button
              type="button"
              onClick={() => setShowBranchDropdown(!showBranchDropdown())}
              class="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-raised hover:bg-surface-raised/80 border border-border-base text-xs font-medium text-text-strong"
            >
              <Icon name="branch" class="size-3 text-text-muted" />
              <span>{git.status.branch}</span>
              <Icon name="chevron-down" class="size-3 text-text-faint" />
            </button>

            {/* Branch dropdown */}
            <Show when={showBranchDropdown()}>
              <div class="absolute left-0 top-full mt-1 z-30 w-56 p-2 bg-surface-base border border-border-base rounded-lg shadow-xl text-xs space-y-2">
                <form onSubmit={handleCreateBranch} class="flex gap-1">
                  <input
                    type="text"
                    placeholder="New branch name..."
                    value={newBranchInput()}
                    onInput={(e) => setNewBranchInput(e.currentTarget.value)}
                    class="flex-1 px-2 py-0.5 bg-surface-raised border border-border-base rounded text-[11px]"
                  />
                  <Button size="small" variant="secondary" type="submit" class="h-6 px-1.5 text-[10px]">
                    Create
                  </Button>
                </form>
                <div class="max-h-40 overflow-y-auto space-y-0.5">
                  <For each={git.branches.all}>
                    {(b) => (
                      <button
                        type="button"
                        onClick={async () => {
                          await git.checkout(b)
                          setShowBranchDropdown(false)
                        }}
                        class={`w-full text-left px-2 py-1 rounded hover:bg-surface-raised truncate ${
                          b === git.status.branch ? "font-bold text-emerald-400" : "text-text-base"
                        }`}
                      >
                        {b}
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          </div>

          {/* Sync actions */}
          <div class="flex items-center gap-1">
            <Button
              size="small"
              variant="ghost"
              onClick={() => void git.pull()}
              disabled={git.isOperating()}
              class="h-6 px-1.5 text-[11px]"
              title="Pull from remote"
            >
              <Icon name="arrow-down-to-line" class="size-3 mr-1" />
              {git.status.behind > 0 ? git.status.behind : "Pull"}
            </Button>
            <Button
              size="small"
              variant="ghost"
              onClick={() => void git.push()}
              disabled={git.isOperating()}
              class="h-6 px-1.5 text-[11px]"
              title="Push to remote"
            >
              <Icon name="arrow-up" class="size-3 mr-1" />
              {git.status.ahead > 0 ? git.status.ahead : "Push"}
            </Button>
          </div>
        </div>

        {/* Commit message input */}
        <div class="space-y-1.5">
          <textarea
            rows="3"
            placeholder="Message (Cmd+Enter to commit)"
            value={commitMessage()}
            onInput={(e) => setCommitMessage(e.currentTarget.value)}
            onKeyDown={handleKeydown}
            class="w-full px-2.5 py-1.5 bg-surface-raised border border-border-base rounded text-xs text-text-base focus:outline-none focus:border-border-strong resize-none font-mono"
          />
          <Button
            size="small"
            variant="primary"
            onClick={() => void handleCommit()}
            disabled={!commitMessage().trim() || git.isOperating() || (git.status.staged.length === 0 && git.status.unstaged.length === 0)}
            class="w-full text-xs font-medium"
          >
            {git.isOperating() ? "Working..." : "Commit"}
          </Button>
        </div>
      </div>

      {/* Changes list */}
      <div class="flex-1 min-h-0 overflow-y-auto p-2 space-y-3">
        {/* Staged Changes */}
        <Show when={git.status.staged.length > 0}>
          <div>
            <div class="flex items-center justify-between text-[11px] font-semibold text-text-muted mb-1 px-1">
              <span>STAGED CHANGES ({git.status.staged.length})</span>
              <button
                type="button"
                onClick={() => void git.unstage(git.status.staged.map((f) => f.path))}
                class="hover:text-text-base text-[10px]"
                title="Unstage All"
              >
                Unstage All
              </button>
            </div>
            <div class="space-y-0.5">
              <For each={git.status.staged}>
                {(f) => (
                  <div
                    onClick={() => void buffer.loadBuffer(f.path)}
                    class="flex items-center justify-between px-2 py-1 rounded hover:bg-surface-raised cursor-pointer group text-xs"
                  >
                    <div class="flex items-center gap-2 truncate">
                      <span class="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                        {f.status[0]}
                      </span>
                      <span class="truncate text-text-base">{f.path}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        void git.unstage([f.path])
                      }}
                      class="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-400 text-text-muted"
                      title="Unstage"
                    >
                      <Icon name="close-small" class="size-3" />
                    </button>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Working Tree Changes */}
        <div>
          <div class="flex items-center justify-between text-[11px] font-semibold text-text-muted mb-1 px-1">
            <span>CHANGES ({git.status.unstaged.length})</span>
            <Show when={git.status.unstaged.length > 0}>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void git.discard(git.status.unstaged.map((f) => f.path))}
                  class="hover:text-rose-400 text-[10px]"
                  title="Discard All"
                >
                  Discard All
                </button>
                <button
                  type="button"
                  onClick={() => void git.stage(git.status.unstaged.map((f) => f.path))}
                  class="hover:text-text-base text-[10px]"
                  title="Stage All"
                >
                  Stage All
                </button>
              </div>
            </Show>
          </div>

          <Show when={git.status.unstaged.length === 0 && git.status.staged.length === 0}>
            <div class="px-2 py-6 text-center text-text-muted text-xs">
              No changes in working tree.
            </div>
          </Show>

          <div class="space-y-0.5">
            <For each={git.status.unstaged}>
              {(f) => (
                <div
                  onClick={() => void buffer.loadBuffer(f.path)}
                  class="flex items-center justify-between px-2 py-1 rounded hover:bg-surface-raised cursor-pointer group text-xs"
                >
                  <div class="flex items-center gap-2 truncate">
                    <span
                      class={`text-[10px] font-mono font-bold uppercase ${
                        f.status === "untracked"
                          ? "text-sky-400"
                          : f.status === "deleted"
                          ? "text-rose-400"
                          : "text-amber-400"
                      }`}
                    >
                      {f.status === "untracked" ? "U" : f.status[0]}
                    </span>
                    <span class="truncate text-text-base">{f.path}</span>
                  </div>
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        void git.discard([f.path])
                      }}
                      class="p-0.5 hover:text-rose-400 text-text-muted"
                      title="Discard Changes"
                    >
                      <Icon name="arrow-undo-down" class="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        void git.stage([f.path])
                      }}
                      class="p-0.5 hover:text-emerald-400 text-text-muted"
                      title="Stage Changes"
                    >
                      <Icon name="plus" class="size-3" />
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>
    </div>
  )
}
