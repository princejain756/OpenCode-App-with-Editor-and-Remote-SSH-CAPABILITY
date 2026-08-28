import { createSignal, createMemo, For, Show } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { FileIcon } from "@opencode-ai/ui/file-icon"
import { useLsp, type DiagnosticItem } from "@/context/lsp"
import { useBuffer } from "@/context/buffer"

export function ProblemsPanel(props: { onClose?: () => void }) {
  const lsp = useLsp()
  const buffer = useBuffer()

  const [filterType, setFilterType] = createSignal<"all" | "errors" | "warnings">("all")
  const [filterText, setFilterText] = createSignal("")
  const [expandedFiles, setExpandedFiles] = createSignal<Record<string, boolean>>({})

  const filteredEntries = createMemo(() => {
    const text = filterText().toLowerCase()
    const type = filterType()
    const entries: { file: string; diagnostics: DiagnosticItem[] }[] = []

    for (const [file, diags] of Object.entries(lsp.diagnosticsByFile)) {
      const filteredDiags = diags.filter((d) => {
        if (type === "errors" && d.severity !== "error") return false
        if (type === "warnings" && d.severity !== "warning") return false
        if (text && !d.message.toLowerCase().includes(text) && !file.toLowerCase().includes(text)) return false
        return true
      })

      if (filteredDiags.length > 0) {
        entries.push({ file, diagnostics: filteredDiags })
      }
    }

    return entries
  })

  const toggleFile = (file: string) => {
    setExpandedFiles((prev) => ({
      ...prev,
      [file]: prev[file] === undefined ? false : !prev[file],
    }))
  }

  const openDiagnostic = (file: string, diag: DiagnosticItem) => {
    void buffer.open(file)
    buffer.updateCursor(file, diag.range.start.line + 1, diag.range.start.character + 1)
  }

  return (
    <div class="flex flex-col h-full w-full bg-surface-base border-t border-border-base select-none">
      {/* Header Bar */}
      <div class="flex items-center justify-between px-3 py-1.5 border-b border-border-base bg-surface-raised/50 text-xs">
        <div class="flex items-center gap-3">
          <span class="font-semibold text-text-strong uppercase tracking-wider text-[11px]">Problems</span>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              class={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                filterType() === "all" ? "bg-surface-raised text-text-base border border-border-base" : "text-text-muted hover:text-text-base"
              }`}
            >
              All ({lsp.totalErrors() + lsp.totalWarnings()})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("errors")}
              class={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                filterType() === "errors" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "text-text-muted hover:text-red-400"
              }`}
            >
              <span class="size-1.5 rounded-full bg-red-500" />
              Errors ({lsp.totalErrors()})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("warnings")}
              class={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                filterType() === "warnings" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "text-text-muted hover:text-amber-400"
              }`}
            >
              <span class="size-1.5 rounded-full bg-amber-500" />
              Warnings ({lsp.totalWarnings()})
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter problems"
            value={filterText()}
            onInput={(e) => setFilterText(e.currentTarget.value)}
            class="px-2 py-0.5 bg-surface-raised border border-border-base rounded text-[11px] text-text-base focus:outline-none focus:border-border-strong w-44 placeholder:text-text-faint"
          />
          <Show when={props.onClose}>
            <IconButton icon="close-small" variant="ghost" class="size-5" onClick={props.onClose} />
          </Show>
        </div>
      </div>

      {/* Diagnostics List */}
      <div class="flex-1 min-h-0 overflow-y-auto p-1 text-xs">
        <Show when={filteredEntries().length === 0}>
          <div class="px-4 py-8 text-center text-text-muted text-xs">
            <Show when={lsp.totalErrors() === 0 && lsp.totalWarnings() === 0} fallback="No matching problems found.">
              No problems have been detected in the workspace.
            </Show>
          </div>
        </Show>

        <For each={filteredEntries()}>
          {(entry) => {
            const isExpanded = () => expandedFiles()[entry.file] !== false

            return (
              <div class="mb-1">
                {/* File Header */}
                <button
                  type="button"
                  onClick={() => toggleFile(entry.file)}
                  class="flex items-center gap-1.5 w-full px-2 py-1 hover:bg-surface-raised rounded text-left font-medium text-text-base"
                >
                  <Icon name={isExpanded() ? "chevron-down" : "chevron-right"} class="size-3 text-text-muted shrink-0" />
                  <FileIcon node={{ path: entry.file, type: "file" }} class="size-3.5 shrink-0" />
                  <span class="truncate flex-1 font-mono text-[11px]">{entry.file}</span>
                  <span class="px-1.5 py-0.2 bg-surface-raised text-[10px] rounded-full text-text-muted font-mono">
                    {entry.diagnostics.length}
                  </span>
                </button>

                {/* Diagnostics in File */}
                <Show when={isExpanded()}>
                  <div class="pl-4 pr-1 py-0.5 space-y-0.5">
                    <For each={entry.diagnostics}>
                      {(diag) => {
                        const isError = diag.severity === "error"
                        return (
                          <button
                            type="button"
                            onClick={() => openDiagnostic(entry.file, diag)}
                            class="flex items-baseline gap-2 w-full px-2 py-1 hover:bg-surface-raised/80 rounded text-left transition-colors group"
                          >
                            <span
                              class={`size-2 rounded-full shrink-0 self-center ${
                                isError ? "bg-red-500" : "bg-amber-500"
                              }`}
                            />
                            <span class="text-text-base text-[11px] flex-1 leading-snug">
                              {diag.message}
                            </span>
                            <span class="text-[10px] text-text-muted font-mono shrink-0">
                              [{diag.range.start.line + 1}, {diag.range.start.character + 1}]
                            </span>
                          </button>
                        )
                      }}
                    </For>
                  </div>
                </Show>
              </div>
            )
          }}
        </For>
      </div>
    </div>
  )
}
