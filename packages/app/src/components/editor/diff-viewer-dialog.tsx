import { createEffect, onCleanup, onMount } from "solid-js"
import * as monaco from "monaco-editor"
import { Dialog as KobalteDialog } from "@kobalte/core/dialog"
import { Button } from "@opencode-ai/ui/button"
import { useTheme } from "@opencode-ai/ui/theme/context"
import { detectLanguage } from "@/context/buffer"

export interface DiffViewerDialogProps {
  open: boolean
  path: string
  diskContent: string
  bufferContent: string
  onKeep: () => void
  onReload: () => void
  onClose: () => void
}

export function DiffViewerDialog(props: DiffViewerDialogProps) {
  let containerRef: HTMLDivElement | undefined
  let diffEditorInstance: monaco.editor.IStandaloneDiffEditor | undefined
  let originalModel: monaco.editor.ITextModel | undefined
  let modifiedModel: monaco.editor.ITextModel | undefined

  const theme = useTheme()

  const getMonacoTheme = () => {
    const scheme = theme.colorScheme()
    const isDark = scheme === "dark" || (scheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
    return isDark ? "vs-dark" : "vs"
  }

  onMount(() => {
    if (!containerRef) return

    const lang = detectLanguage(props.path)
    const diskUri = monaco.Uri.parse(`diff-disk:///${props.path.replace(/\\/g, "/")}`)
    const bufferUri = monaco.Uri.parse(`diff-buffer:///${props.path.replace(/\\/g, "/")}`)

    originalModel = monaco.editor.getModel(diskUri) ?? monaco.editor.createModel(props.diskContent, lang, diskUri)
    modifiedModel = monaco.editor.getModel(bufferUri) ?? monaco.editor.createModel(props.bufferContent, lang, bufferUri)

    originalModel.setValue(props.diskContent)
    modifiedModel.setValue(props.bufferContent)

    diffEditorInstance = monaco.editor.createDiffEditor(containerRef, {
      theme: getMonacoTheme(),
      readOnly: true,
      automaticLayout: true,
      renderSideBySide: true,
      scrollBeyondLastLine: false,
      fontSize: 13,
      minimap: { enabled: false },
    })

    diffEditorInstance.setModel({
      original: originalModel,
      modified: modifiedModel,
    })

    onCleanup(() => {
      diffEditorInstance?.dispose()
      diffEditorInstance = undefined
    })
  })

  createEffect(() => {
    if (originalModel && modifiedModel) {
      originalModel.setValue(props.diskContent)
      modifiedModel.setValue(props.bufferContent)
    }
  })

  createEffect(() => {
    monaco.editor.setTheme(getMonacoTheme())
  })

  return (
    <KobalteDialog open={props.open} onOpenChange={(open: boolean) => !open && props.onClose()}>
      <KobalteDialog.Portal>
        <KobalteDialog.Overlay class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm animate-fade-in" />
        <KobalteDialog.Content class="fixed left-[50%] top-[50%] z-50 w-[92vw] max-w-6xl h-[85vh] translate-x-[-50%] translate-y-[-50%] flex flex-col bg-surface-base border border-border-base rounded-xl shadow-2xl overflow-hidden animate-scale-in">
          <div class="flex items-center justify-between px-5 py-3 border-b border-border-base bg-surface-raised">
            <div>
              <KobalteDialog.Title class="text-sm font-semibold text-text-base">
                Conflict Diff: {props.path}
              </KobalteDialog.Title>
              <div class="text-[11px] text-text-muted">
                Left: Disk Version (External / Agent) &nbsp;|&nbsp; Right: Buffer Version (Unsaved Local Edits)
              </div>
            </div>
            <div class="flex items-center gap-2">
              <Button size="small" variant="ghost" onClick={props.onClose}>
                Cancel
              </Button>
              <Button size="small" variant="secondary" onClick={() => { props.onReload(); props.onClose() }}>
                Reload from Disk
              </Button>
              <Button size="small" variant="primary" onClick={() => { props.onKeep(); props.onClose() }}>
                Keep Local Edits
              </Button>
            </div>
          </div>

          <div class="flex-1 w-full min-h-0 relative">
            <div ref={containerRef} class="absolute inset-0" />
          </div>
        </KobalteDialog.Content>
      </KobalteDialog.Portal>
    </KobalteDialog>
  )
}
