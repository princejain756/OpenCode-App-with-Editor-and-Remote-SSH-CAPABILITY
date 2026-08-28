import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js"
import * as monaco from "monaco-editor"
import { useBuffer } from "@/context/buffer"
import { useLsp } from "@/context/lsp"
import { useTheme } from "@opencode-ai/ui/theme/context"
import { Breadcrumbs } from "./breadcrumbs"
import { ConflictBanner } from "./conflict-banner"
import { EditorStatusBar } from "./editor-status-bar"
import { EditorSettingsDialog } from "./editor-settings-dialog"
import { DiffViewerDialog } from "./diff-viewer-dialog"
import { registerMonacoLspProviders, syncModelDiagnostics, ProblemsPanel } from "@/components/lsp"

export interface MonacoEditorProps {
  path: string
  class?: string
}

export function MonacoEditor(props: MonacoEditorProps) {
  let containerRef: HTMLDivElement | undefined
  let editorInstance: monaco.editor.IStandaloneCodeEditor | undefined
  let currentModel: monaco.editor.ITextModel | undefined

  const buffer = useBuffer()
  const lsp = useLsp()
  const theme = useTheme()
  const [showSettings, setShowSettings] = createSignal(false)
  const [showDiff, setShowDiff] = createSignal(false)
  const [showProblems, setShowProblems] = createSignal(false)

  const activeBuf = () => buffer.getBuffer(props.path)

  const getMonacoTheme = () => {
    const scheme = theme.colorScheme()
    const isDark = scheme === "dark" || (scheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
    return isDark ? "vs-dark" : "vs"
  }

  onMount(() => {
    if (!containerRef) return

    // Ensure buffer is loaded
    void buffer.loadBuffer(props.path)

    const initialBuf = activeBuf()
    const initialContent = initialBuf?.content ?? ""
    const initialLang = initialBuf?.language ?? "plaintext"

    // Create or retrieve model
    const fileUri = monaco.Uri.parse(`file:///${props.path.replace(/\\/g, "/")}`)
    currentModel = monaco.editor.getModel(fileUri) ?? monaco.editor.createModel(initialContent, initialLang, fileUri)

    editorInstance = monaco.editor.create(containerRef, {
      model: currentModel,
      theme: getMonacoTheme(),
      fontSize: buffer.settings.fontSize,
      tabSize: buffer.settings.tabSize,
      wordWrap: buffer.settings.wordWrap,
      minimap: { enabled: buffer.settings.minimap },
      lineNumbers: buffer.settings.lineNumbers,
      folding: buffer.settings.folding,
      bracketPairColorization: { enabled: buffer.settings.bracketPairColorization },
      renderWhitespace: buffer.settings.renderWhitespace,
      fontFamily: buffer.settings.fontFamily,
      cursorBlinking: buffer.settings.cursorBlinking,
      smoothScrolling: buffer.settings.smoothScrolling,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      roundedSelection: true,
      contextmenu: true,
    })

    // Save action Cmd/Ctrl+S
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      void buffer.save(props.path)
    })

    // Content change
    const contentDisposable = currentModel.onDidChangeContent(() => {
      if (!currentModel || !editorInstance) return
      const val = currentModel.getValue()
      buffer.updateContent(props.path, val)
    })

    // Cursor change
    const cursorDisposable = editorInstance.onDidChangeCursorPosition((e) => {
      buffer.updateCursor(props.path, e.position.lineNumber, e.position.column)
    })

    // Scroll change
    const scrollDisposable = editorInstance.onDidScrollChange((e) => {
      buffer.updateScroll(props.path, e.scrollTop, e.scrollLeft)
    })

    // Initialize LSP providers
    registerMonacoLspProviders(lsp)
    syncModelDiagnostics(props.path, currentModel, lsp)

    onCleanup(() => {
      contentDisposable.dispose()
      cursorDisposable.dispose()
      scrollDisposable.dispose()
      editorInstance?.dispose()
      editorInstance = undefined
    })
  })

  // Synchronize LSP diagnostics markers
  createEffect(() => {
    if (currentModel) {
      syncModelDiagnostics(props.path, currentModel, lsp)
    }
  })

  // Synchronize buffer content changes from outside (e.g. file reload or external update)
  createEffect(() => {
    const buf = activeBuf()
    if (!buf || !currentModel || !editorInstance) return

    const editorValue = currentModel.getValue()
    if (buf.content !== editorValue && !buf.isDirty) {
      currentModel.setValue(buf.content)
    }

    if (buf.language && monaco.languages.getLanguages().some((l) => l.id === buf.language)) {
      monaco.editor.setModelLanguage(currentModel, buf.language)
    }
  })

  // Synchronize editor settings
  createEffect(() => {
    if (!editorInstance) return
    editorInstance.updateOptions({
      fontSize: buffer.settings.fontSize,
      tabSize: buffer.settings.tabSize,
      wordWrap: buffer.settings.wordWrap,
      minimap: { enabled: buffer.settings.minimap },
      lineNumbers: buffer.settings.lineNumbers,
      folding: buffer.settings.folding,
      bracketPairColorization: { enabled: buffer.settings.bracketPairColorization },
      renderWhitespace: buffer.settings.renderWhitespace,
      fontFamily: buffer.settings.fontFamily,
      cursorBlinking: buffer.settings.cursorBlinking,
      smoothScrolling: buffer.settings.smoothScrolling,
    })
  })

  // Synchronize theme
  createEffect(() => {
    monaco.editor.setTheme(getMonacoTheme())
  })

  return (
    <div class={`flex flex-col h-full w-full bg-surface-base ${props.class ?? ""}`}>
      <Breadcrumbs path={props.path} />

      <Show when={activeBuf()?.hasConflict}>
        <ConflictBanner
          onKeep={() => buffer.resolveConflict(props.path, "keep")}
          onReload={() => buffer.resolveConflict(props.path, "reload")}
          onCompare={() => setShowDiff(true)}
        />
      </Show>

      <div class="flex-1 w-full min-h-0 relative">
        <div ref={containerRef} class="absolute inset-0" />
      </div>

      <Show when={showProblems()}>
        <div class="h-44 shrink-0">
          <ProblemsPanel onClose={() => setShowProblems(false)} />
        </div>
      </Show>

      <EditorStatusBar
        buffer={activeBuf()}
        onOpenSettings={() => setShowSettings(true)}
        onToggleProblems={() => setShowProblems(!showProblems())}
      />

      <EditorSettingsDialog
        open={showSettings()}
        onOpenChange={setShowSettings}
      />

      <Show when={activeBuf()?.hasConflict}>
        <DiffViewerDialog
          open={showDiff()}
          path={props.path}
          diskContent={activeBuf()?.conflictContent ?? activeBuf()?.diskContent ?? ""}
          bufferContent={activeBuf()?.content ?? ""}
          onKeep={() => buffer.resolveConflict(props.path, "keep")}
          onReload={() => buffer.resolveConflict(props.path, "reload")}
          onClose={() => setShowDiff(false)}
        />
      </Show>
    </div>
  )
}
