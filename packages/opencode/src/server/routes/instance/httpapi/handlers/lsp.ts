import * as InstanceState from "@/effect/instance-state"
import { LSP } from "@/lsp/lsp"
import { Diagnostic } from "@/lsp/diagnostic"
import { Effect, Layer } from "effect"
import path from "path"
import { pathToFileURL, fileURLToPath } from "url"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { InstanceHttpApi } from "../api"

export const lspHandlers = HttpApiBuilder.group(InstanceHttpApi, "lsp", (handlers) =>
  Effect.gen(function* () {
    const lsp = yield* LSP.Service

    const diagnostics = Effect.fn("LspHttpApi.diagnostics")(function* () {
      const directory = (yield* InstanceState.context).directory
      const diagMap = yield* lsp.diagnostics()
      const result: { file: string; diagnostics: any[] }[] = []

      for (const [uriOrPath, diags] of Object.entries(diagMap)) {
        const fullPath = uriOrPath.startsWith("file://") ? fileURLToPath(uriOrPath) : uriOrPath
        const relPath = path.isAbsolute(fullPath) ? path.relative(directory, fullPath) : fullPath

        const formattedDiags = diags.map((d) => {
          let severity: "error" | "warning" | "information" | "hint" = "error"
          if (d.severity === 2) severity = "warning"
          else if (d.severity === 3) severity = "information"
          else if (d.severity === 4) severity = "hint"

          return {
            range: {
              start: { line: d.range.start.line, character: d.range.start.character },
              end: { line: d.range.end.line, character: d.range.end.character },
            },
            message: d.message,
            severity,
            source: d.source,
            code: d.code,
          }
        })

        result.push({ file: relPath, diagnostics: formattedDiags })
      }
      return result
    })

    const hover = Effect.fn("LspHttpApi.hover")(function* (ctx: {
      payload: { file: string; line: number; character: number }
    }) {
      const directory = (yield* InstanceState.context).directory
      const fullPath = path.resolve(directory, ctx.payload.file)
      const hoverData = yield* lsp.hover({
        file: fullPath,
        line: ctx.payload.line,
        character: ctx.payload.character,
      })

      const contents: string[] = []
      if (hoverData) {
        const rawContents = (hoverData as any).contents
        if (typeof rawContents === "string") {
          contents.push(rawContents)
        } else if (Array.isArray(rawContents)) {
          for (const item of rawContents) {
            if (typeof item === "string") contents.push(item)
            else if (item && typeof item === "object" && "value" in item) contents.push(item.value)
          }
        } else if (rawContents && typeof rawContents === "object" && "value" in rawContents) {
          contents.push(rawContents.value)
        }
      }

      return {
        contents,
        range: (hoverData as any)?.range
          ? {
              start: {
                line: (hoverData as any).range.start.line,
                character: (hoverData as any).range.start.character,
              },
              end: {
                line: (hoverData as any).range.end.line,
                character: (hoverData as any).range.end.character,
              },
            }
          : undefined,
      }
    })

    const definition = Effect.fn("LspHttpApi.definition")(function* (ctx: {
      payload: { file: string; line: number; character: number }
    }) {
      const directory = (yield* InstanceState.context).directory
      const fullPath = path.resolve(directory, ctx.payload.file)
      const defs = yield* lsp.definition({
        file: fullPath,
        line: ctx.payload.line,
        character: ctx.payload.character,
      })

      return (defs as any[]).map((def) => {
        const uri = def.uri ?? def.targetUri ?? ""
        const range = def.range ?? def.targetRange ?? { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
        return {
          uri,
          range: {
            start: { line: range.start.line, character: range.start.character },
            end: { line: range.end.line, character: range.end.character },
          },
        }
      })
    })

    const references = Effect.fn("LspHttpApi.references")(function* (ctx: {
      payload: { file: string; line: number; character: number }
    }) {
      const directory = (yield* InstanceState.context).directory
      const fullPath = path.resolve(directory, ctx.payload.file)
      const refs = yield* lsp.references({
        file: fullPath,
        line: ctx.payload.line,
        character: ctx.payload.character,
      })

      return (refs as any[]).map((ref) => ({
        uri: ref.uri ?? "",
        range: {
          start: { line: ref.range?.start.line ?? 0, character: ref.range?.start.character ?? 0 },
          end: { line: ref.range?.end.line ?? 0, character: ref.range?.end.character ?? 0 },
        },
      }))
    })

    const documentSymbols = Effect.fn("LspHttpApi.documentSymbols")(function* (ctx: {
      payload: { file: string }
    }) {
      const directory = (yield* InstanceState.context).directory
      const fullPath = path.resolve(directory, ctx.payload.file)
      const uri = pathToFileURL(fullPath).href
      return yield* lsp.documentSymbol(uri)
    })

    const workspaceSymbols = Effect.fn("LspHttpApi.workspaceSymbols")(function* (ctx: {
      payload: { query: string }
    }) {
      return yield* lsp.workspaceSymbol(ctx.payload.query)
    })

    const status = Effect.fn("LspHttpApi.status")(function* () {
      return yield* lsp.status()
    })

    return handlers
      .handle("diagnostics", diagnostics)
      .handle("hover", hover)
      .handle("definition", definition)
      .handle("references", references)
      .handle("documentSymbols", documentSymbols)
      .handle("workspaceSymbols", workspaceSymbols)
      .handle("status", status)
  }),
)
