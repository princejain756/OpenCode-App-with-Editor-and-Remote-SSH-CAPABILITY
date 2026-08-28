import { createSignal, createEffect, onCleanup, onMount, For, Show } from "solid-js"
import * as monaco from "monaco-editor"
import { Dialog as KobalteDialog } from "@kobalte/core/dialog"
import { Button } from "@opencode-ai/ui/button"
import { Icon } from "@opencode-ai/ui/icon"
import { FileIcon } from "@opencode-ai/ui/file-icon"
import { useAgentReview, type AgentFileChange } from "@/context/agent-review"
import { useTheme } from "@opencode-ai/ui/theme/context"

export interface AgentBatchReviewDialogProps {
  open: boolean
  onClose: () => void
}

export function AgentBatchReviewDialog(props: AgentBatchReviewDialogProps) {
  const agentReview = useAgentReview()
  const theme = useTheme()

  const [activeFile, setActiveFile] = createSignal<string | undefined>(undefined)
  let diffContainerRef: HTMLDivElement | undefined
  let diffEditorInstance: monaco.editor.IStandaloneDiffEditor | undefined

  const pendingList = () => agentReview.pendingFiles()

  // Select initial file
  createEffect(() => {
    if (props.open && pendingList().length > 0 && !activeFile()) {
      setActiveFile(pendingList()[0].path)
    }
  })

  const currentChange = (): AgentFileChange | undefined => {
    const f = activeFile()
    return f ? agentReview.changes[f] : undefined
  }

  const getMonacoTheme = () => {
    const scheme = theme.colorScheme()
    const isDark = scheme === "dark" || (scheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
    return isDark ? "vs-dark" : "vs"
  }

  const updateDiffModels = () => {
    const change = currentChange()
    if (!diffEditorInstance || !change) return

    const origModel = monaco.editor.createModel(change.originalContent, "plaintext", monaco.Uri.parse(`agent-orig://${change.path}`))
    const propModel = monaco.editor.createModel(change.proposedContent, "plaintext", monaco.Uri.parse(`agent-prop://${change.path}`))

    diffEditorInstance.setModel({
      original: origModel,
      modified: propModel,
    })
  }

  createEffect(() => {
    if (activeFile()) {
      updateDiffModels()
    }
  })

  onMount(() => {
    if (!diffContainerRef) return

    diffEditorInstance = monaco.editor.createDiffEditor(diffContainerRef, {
      theme: getMonacoTheme(),
      readOnly: true,
      automaticLayout: true,
      renderSideBySide: true,
      originalEditable: false,
      scrollBeyondLastLine: false,
    })

    updateDiffModels()

    onCleanup(() => {
      diffEditorInstance?.dispose()
      diffEditorInstance = undefined
    })
  })

  return (
    <KobalteDialog open={props.open} onOpenChange={(val: boolean) => !val && props.onClose()}>
      <KobalteDialog.Portal>
        <KobalteDialog.Overlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <KobalteDialog.Content class="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] rounded-xl shadow-2xl overflow-hidden border border-border-base bg-surface-base">
          <div class="flex flex-col h-[75vh] w-[85vw] max-w-6xl">
            {/* Header Bar */}
            <div class="flex items-center justify-between px-4 py-3 border-b border-border-base bg-surface-raised/50">
              <div class="flex items-center gap-3">
                <Icon name="brain" class="size-5 text-purple-400" />
                <div>
                  <h3 class="text-sm font-semibold text-text-strong">Review Proposed Agent Changes</h3>
                  <p class="text-xs text-text-muted">
                    {pendingList().length} file(s) awaiting your review
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => void agentReview.rejectAll()}
                  class="text-rose-400 hover:text-rose-300"
                >
                  Reject All ({pendingList().length})
                </Button>
                <Button
                  size="small"
                  variant="primary"
                  onClick={() => void agentReview.acceptAll()}
                  class="bg-purple-600 hover:bg-purple-500 text-white"
                >
                  Accept All ({pendingList().length})
                </Button>
              </div>
            </div>

            {/* Content Body: Sidebar + Diff View */}
            <div class="flex flex-1 min-h-0">
              {/* File list sidebar */}
              <div class="w-64 border-r border-border-base bg-surface-raised/20 overflow-y-auto p-2 space-y-1">
                <For each={pendingList()}>
                  {(item) => {
                    const isSelected = () => activeFile() === item.path
                    return (
                      <button
                        type="button"
                        onClick={() => setActiveFile(item.path)}
                        class={`flex items-center justify-between w-full px-2.5 py-1.5 rounded text-left text-xs transition-colors ${
                          isSelected() ? "bg-purple-600/20 text-purple-200 font-medium" : "text-text-muted hover:bg-surface-raised hover:text-text-base"
                        }`}
                      >
                        <div class="flex items-center gap-2 truncate">
                          <FileIcon node={{ path: item.path, type: "file" }} class="size-3.5 shrink-0" />
                          <span class="truncate font-mono text-[11px]">{item.path}</span>
                        </div>
                        <div class="flex items-center gap-1 font-mono text-[10px] shrink-0">
                          <span class="text-emerald-400">+{item.additions}</span>
                          <span class="text-rose-400">-{item.deletions}</span>
                        </div>
                      </button>
                    )
                  }}
                </For>
              </div>

              {/* Diff view */}
              <div class="flex-1 flex flex-col min-w-0">
                <Show when={currentChange()}>
                  {(change) => (
                    <div class="flex items-center justify-between px-3 py-1.5 border-b border-border-base bg-surface-raised/40 text-xs">
                      <span class="font-mono text-[11px] text-text-strong">{change().path}</span>
                      <div class="flex items-center gap-2">
                        <Button
                          size="small"
                          variant="ghost"
                          onClick={() => void agentReview.rejectFile(change().path)}
                          class="h-6 px-2 text-xs text-rose-300 hover:text-rose-200"
                        >
                          Reject This File
                        </Button>
                        <Button
                          size="small"
                          variant="primary"
                          onClick={() => void agentReview.acceptFile(change().path)}
                          class="h-6 px-2.5 text-xs bg-purple-600 hover:bg-purple-500 text-white"
                        >
                          Accept This File
                        </Button>
                      </div>
                    </div>
                  )}
                </Show>

                <div class="flex-1 w-full relative">
                  <div ref={diffContainerRef} class="absolute inset-0" />
                </div>
              </div>
            </div>
          </div>
        </KobalteDialog.Content>
      </KobalteDialog.Portal>
    </KobalteDialog>
  )
}
