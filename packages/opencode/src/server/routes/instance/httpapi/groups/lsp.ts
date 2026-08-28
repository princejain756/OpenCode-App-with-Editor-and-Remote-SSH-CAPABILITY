import { LSP } from "@/lsp/lsp"
import { NonNegativeInt } from "@opencode-ai/core/schema"
import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, OpenApi } from "effect/unstable/httpapi"
import { Authorization } from "../middleware/authorization"
import { InstanceContextMiddleware } from "../middleware/instance-context"
import {
  WorkspaceRoutingMiddleware,
  WorkspaceRoutingQuery,
  WorkspaceRoutingQueryFields,
} from "../middleware/workspace-routing"
import { described } from "./metadata"

export const DiagnosticSeverity = Schema.Literals(["error", "warning", "information", "hint"])

export const LspPosition = Schema.Struct({
  line: NonNegativeInt,
  character: NonNegativeInt,
})

export const LspRange = Schema.Struct({
  start: LspPosition,
  end: LspPosition,
})

export const DiagnosticItem = Schema.Struct({
  range: LspRange,
  message: Schema.String,
  severity: Schema.optional(DiagnosticSeverity),
  source: Schema.optional(Schema.String),
  code: Schema.optional(Schema.Union([Schema.String, Schema.Number])),
}).annotate({ identifier: "DiagnosticItem" })

export const FileDiagnostics = Schema.Struct({
  file: Schema.String,
  diagnostics: Schema.Array(DiagnosticItem),
}).annotate({ identifier: "FileDiagnostics" })

export const LspLocationPayload = Schema.Struct({
  file: Schema.String,
  line: NonNegativeInt,
  character: NonNegativeInt,
})

export const LspFilePayload = Schema.Struct({
  file: Schema.String,
})

export const LspQueryPayload = Schema.Struct({
  query: Schema.String,
})

export const LspHoverResult = Schema.Struct({
  contents: Schema.Array(Schema.String),
  range: Schema.optional(LspRange),
}).annotate({ identifier: "LspHoverResult" })

export const LspLocationResult = Schema.Struct({
  uri: Schema.String,
  range: LspRange,
}).annotate({ identifier: "LspLocationResult" })

export const LspPaths = {
  diagnostics: "/lsp/diagnostics",
  hover: "/lsp/hover",
  definition: "/lsp/definition",
  references: "/lsp/references",
  documentSymbols: "/lsp/document-symbols",
  workspaceSymbols: "/lsp/workspace-symbols",
  status: "/lsp/status",
} as const

export const LspApi = HttpApi.make("lsp")
  .add(
    HttpApiGroup.make("lsp")
      .add(
        HttpApiEndpoint.get("diagnostics", LspPaths.diagnostics, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(FileDiagnostics), "Workspace diagnostics"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "lsp.diagnostics",
            summary: "Get diagnostics",
            description: "Get all current diagnostics reported by active language servers.",
          }),
        ),
        HttpApiEndpoint.post("hover", LspPaths.hover, {
          payload: LspLocationPayload,
          query: WorkspaceRoutingQuery,
          success: described(LspHoverResult, "Hover information"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "lsp.hover",
            summary: "Get hover tooltip",
            description: "Get type and documentation hover tooltip for a code position.",
          }),
        ),
        HttpApiEndpoint.post("definition", LspPaths.definition, {
          payload: LspLocationPayload,
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(LspLocationResult), "Definition locations"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "lsp.definition",
            summary: "Go to definition",
            description: "Get definition locations for a symbol at a code position.",
          }),
        ),
        HttpApiEndpoint.post("references", LspPaths.references, {
          payload: LspLocationPayload,
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(LspLocationResult), "References locations"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "lsp.references",
            summary: "Find references",
            description: "Get reference locations for a symbol at a code position.",
          }),
        ),
        HttpApiEndpoint.post("documentSymbols", LspPaths.documentSymbols, {
          payload: LspFilePayload,
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(Schema.Union([LSP.DocumentSymbol, LSP.Symbol])), "Document symbols"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "lsp.documentSymbols",
            summary: "Get document symbols",
            description: "Get outline symbols defined within a document.",
          }),
        ),
        HttpApiEndpoint.post("workspaceSymbols", LspPaths.workspaceSymbols, {
          payload: LspQueryPayload,
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(LSP.Symbol), "Workspace symbols"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "lsp.workspaceSymbols",
            summary: "Get workspace symbols",
            description: "Search for symbols defined across the workspace.",
          }),
        ),
        HttpApiEndpoint.get("status", LspPaths.status, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(LSP.Status), "LSP server status"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "lsp.status",
            summary: "Get LSP status",
            description: "Get connection status of language servers.",
          }),
        ),
      )
      .annotateMerge(
        OpenApi.annotations({
          title: "lsp",
          description: "Language Server Protocol HttpApi routes.",
        }),
      )
      .middleware(InstanceContextMiddleware)
      .middleware(WorkspaceRoutingMiddleware)
      .middleware(Authorization),
  )
