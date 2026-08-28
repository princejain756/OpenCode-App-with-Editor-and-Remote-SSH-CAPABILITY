import { batch, createEffect, createMemo, createSignal, onCleanup } from "solid-js"
import { createStore, reconcile } from "solid-js/store"
import { createSimpleContext } from "@opencode-ai/ui/context"
import { useSDK } from "./sdk"
import { useServerSDK } from "./server-sdk"

export interface DiagnosticItem {
  range: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
  message: string
  severity?: "error" | "warning" | "information" | "hint"
  source?: string
  code?: string | number
}

export interface FileDiagnostics {
  file: string
  diagnostics: DiagnosticItem[]
}

export interface LspHoverResult {
  contents: string[]
  range?: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
}

export interface LspLocationResult {
  uri: string
  range: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
}

export const { use: useLsp, provider: LspProvider } = createSimpleContext({
  name: "Lsp",
  gate: false,
  init: () => {
    const sdk = useSDK()
    const serverSDK = useServerSDK()

    const [diagnosticsByFile, setDiagnosticsByFile] = createStore<Record<string, DiagnosticItem[]>>({})
    const [isLoading, setIsLoading] = createSignal(false)

    const fetchDiagnostics = async () => {
      try {
        setIsLoading(true)
        const client = serverSDK().client as any
        let list: FileDiagnostics[] = []

        if (client.lsp?.diagnostics) {
          const res = await client.lsp.diagnostics()
          list = res.data ?? []
        } else {
          const url = `${serverSDK().url}/lsp/diagnostics`
          const res = await fetch(url)
          if (res.ok) {
            list = await res.json()
          }
        }

        const map: Record<string, DiagnosticItem[]> = {}
        for (const item of list) {
          if (item.diagnostics.length > 0) {
            map[item.file] = item.diagnostics
          }
        }

        batch(() => {
          setDiagnosticsByFile(reconcile(map))
        })
      } catch (err) {
        console.error("[lsp] failed to fetch diagnostics", err)
      } finally {
        setIsLoading(false)
      }
    }

    // Refresh on directory change
    createEffect(() => {
      const dir = sdk().directory
      if (!dir) return
      void fetchDiagnostics()
    })

    // Listen to lsp.updated event
    const unsub = serverSDK().event.on(sdk().directory, (event: any) => {
      if (event.type === "lsp.updated") {
        void fetchDiagnostics()
      }
    })
    onCleanup(unsub)

    const totalErrors = createMemo(() => {
      let count = 0
      for (const file of Object.keys(diagnosticsByFile)) {
        count += (diagnosticsByFile[file] || []).filter((d) => d.severity === "error").length
      }
      return count
    })

    const totalWarnings = createMemo(() => {
      let count = 0
      for (const file of Object.keys(diagnosticsByFile)) {
        count += (diagnosticsByFile[file] || []).filter((d) => d.severity === "warning").length
      }
      return count
    })

    const getHover = async (file: string, line: number, character: number): Promise<LspHoverResult | undefined> => {
      try {
        const client = serverSDK().client as any
        if (client.lsp?.hover) {
          const res = await client.lsp.hover({ file, line, character })
          return res.data
        }
        const url = `${serverSDK().url}/lsp/hover`
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file, line, character }),
        })
        if (res.ok) return await res.json()
      } catch {}
      return undefined
    }

    const getDefinition = async (file: string, line: number, character: number): Promise<LspLocationResult[]> => {
      try {
        const client = serverSDK().client as any
        if (client.lsp?.definition) {
          const res = await client.lsp.definition({ file, line, character })
          return res.data ?? []
        }
        const url = `${serverSDK().url}/lsp/definition`
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file, line, character }),
        })
        if (res.ok) return await res.json()
      } catch {}
      return []
    }

    const getReferences = async (file: string, line: number, character: number): Promise<LspLocationResult[]> => {
      try {
        const client = serverSDK().client as any
        if (client.lsp?.references) {
          const res = await client.lsp.references({ file, line, character })
          return res.data ?? []
        }
        const url = `${serverSDK().url}/lsp/references`
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file, line, character }),
        })
        if (res.ok) return await res.json()
      } catch {}
      return []
    }

    const getDocumentSymbols = async (file: string): Promise<any[]> => {
      try {
        const client = serverSDK().client as any
        if (client.lsp?.documentSymbols) {
          const res = await client.lsp.documentSymbols({ file })
          return res.data ?? []
        }
        const url = `${serverSDK().url}/lsp/document-symbols`
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file }),
        })
        if (res.ok) return await res.json()
      } catch {}
      return []
    }

    return {
      diagnosticsByFile,
      totalErrors,
      totalWarnings,
      isLoading,
      fetchDiagnostics,
      getHover,
      getDefinition,
      getReferences,
      getDocumentSymbols,
    }
  },
})
