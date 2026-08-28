import * as monaco from "monaco-editor"
import type { useLsp } from "@/context/lsp"

let providersRegistered = false

export function registerMonacoLspProviders(lsp: ReturnType<typeof useLsp>) {
  if (providersRegistered) return
  providersRegistered = true

  const languages = [
    "typescript",
    "javascript",
    "typescriptreact",
    "javascriptreact",
    "python",
    "go",
    "rust",
    "html",
    "css",
    "json",
    "yaml",
  ]

  for (const lang of languages) {
    // Hover Provider
    monaco.languages.registerHoverProvider(lang, {
      provideHover: async (model, position) => {
        const filePath = model.uri.path.replace(/^\//, "")
        const line = position.lineNumber - 1
        const character = position.column - 1

        const hoverData = await lsp.getHover(filePath, line, character)
        if (!hoverData || hoverData.contents.length === 0) return null

        return {
          range: hoverData.range
            ? new monaco.Range(
                hoverData.range.start.line + 1,
                hoverData.range.start.character + 1,
                hoverData.range.end.line + 1,
                hoverData.range.end.character + 1,
              )
            : undefined,
          contents: hoverData.contents.map((c) => ({ value: c })),
        }
      },
    })

    // Definition Provider
    monaco.languages.registerDefinitionProvider(lang, {
      provideDefinition: async (model, position) => {
        const filePath = model.uri.path.replace(/^\//, "")
        const line = position.lineNumber - 1
        const character = position.column - 1

        const defs = await lsp.getDefinition(filePath, line, character)
        if (!defs || defs.length === 0) return null

        return defs.map((d) => {
          let targetUri = d.uri
          if (!targetUri.startsWith("file://")) {
            targetUri = `file:///${targetUri.replace(/\\/g, "/")}`
          }
          return {
            uri: monaco.Uri.parse(targetUri),
            range: new monaco.Range(
              d.range.start.line + 1,
              d.range.start.character + 1,
              d.range.end.line + 1,
              d.range.end.character + 1,
            ),
          }
        })
      },
    })

    // Reference Provider
    monaco.languages.registerReferenceProvider(lang, {
      provideReferences: async (model, position) => {
        const filePath = model.uri.path.replace(/^\//, "")
        const line = position.lineNumber - 1
        const character = position.column - 1

        const refs = await lsp.getReferences(filePath, line, character)
        if (!refs || refs.length === 0) return null

        return refs.map((r) => {
          let targetUri = r.uri
          if (!targetUri.startsWith("file://")) {
            targetUri = `file:///${targetUri.replace(/\\/g, "/")}`
          }
          return {
            uri: monaco.Uri.parse(targetUri),
            range: new monaco.Range(
              r.range.start.line + 1,
              r.range.start.character + 1,
              r.range.end.line + 1,
              r.range.end.character + 1,
            ),
          }
        })
      },
    })
  }
}

export function syncModelDiagnostics(filePath: string, model: monaco.editor.ITextModel, lsp: ReturnType<typeof useLsp>) {
  const norm = filePath.replace(/\\/g, "/")
  const diagnostics = lsp.diagnosticsByFile[norm] ?? []

  const markers: monaco.editor.IMarkerData[] = diagnostics.map((d) => {
    let severity = monaco.MarkerSeverity.Error
    if (d.severity === "warning") severity = monaco.MarkerSeverity.Warning
    else if (d.severity === "information") severity = monaco.MarkerSeverity.Info
    else if (d.severity === "hint") severity = monaco.MarkerSeverity.Hint

    return {
      severity,
      message: d.message,
      startLineNumber: d.range.start.line + 1,
      startColumn: d.range.start.character + 1,
      endLineNumber: d.range.end.line + 1,
      endColumn: d.range.end.character + 1,
      source: d.source,
      code: d.code ? String(d.code) : undefined,
    }
  })

  monaco.editor.setModelMarkers(model, "lsp", markers)
}
