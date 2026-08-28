import { FileSystem } from "@opencode-ai/core/filesystem"
import { NonNegativeInt } from "@opencode-ai/core/schema"
import { LSP } from "@/lsp/lsp"
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

export const FileQuery = Schema.Struct({
  ...WorkspaceRoutingQueryFields,
  path: Schema.String,
})

export const FindTextQuery = Schema.Struct({
  ...WorkspaceRoutingQueryFields,
  pattern: Schema.String,
  caseSensitive: Schema.optional(Schema.Literals(["true", "false"])),
  isRegex: Schema.optional(Schema.Literals(["true", "false"])),
  matchWholeWord: Schema.optional(Schema.Literals(["true", "false"])),
  include: Schema.optional(Schema.String),
  exclude: Schema.optional(Schema.String),
  limit: Schema.optional(
    Schema.NumberFromString.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1), Schema.isLessThanOrEqualTo(1000)),
  ),
})

export const FindFileQuery = Schema.Struct({
  ...WorkspaceRoutingQueryFields,
  query: Schema.String,
  dirs: Schema.optional(Schema.Literals(["true", "false"])),
  type: Schema.optional(Schema.Literals(["file", "directory"])),
  limit: Schema.optional(
    Schema.NumberFromString.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(1), Schema.isLessThanOrEqualTo(200)),
  ),
})

export const FindSymbolQuery = Schema.Struct({
  ...WorkspaceRoutingQueryFields,
  query: Schema.String,
})

export const WriteFilePayload = Schema.Struct({
  path: Schema.String,
  content: Schema.String,
})

export const CreateFilePayload = Schema.Struct({
  path: Schema.String,
  type: Schema.Literals(["file", "directory"]),
  content: Schema.optional(Schema.String),
})

export const DeleteFilePayload = Schema.Struct({
  path: Schema.String,
  recursive: Schema.optional(Schema.Boolean),
})

export const RenameFilePayload = Schema.Struct({
  oldPath: Schema.String,
  newPath: Schema.String,
})

export const ReplaceFilePayload = Schema.Struct({
  query: Schema.String,
  replace: Schema.String,
  files: Schema.optional(Schema.Array(Schema.String)),
  caseSensitive: Schema.optional(Schema.Boolean),
  isRegex: Schema.optional(Schema.Boolean),
  matchWholeWord: Schema.optional(Schema.Boolean),
})

export const ReplaceResult = Schema.Struct({
  filesModified: Schema.Array(Schema.String),
  matchesReplaced: Schema.Number,
}).annotate({ identifier: "ReplaceResult" })

export const FileStatResult = Schema.Struct({
  exists: Schema.Boolean,
  type: Schema.optional(Schema.Literals(["file", "directory", "symlink", "other"])),
  size: Schema.optional(Schema.Number),
  mtime: Schema.optional(Schema.Number),
}).annotate({ identifier: "FileStatResult" })

export const LegacyMatch = Schema.Struct({
  path: Schema.Struct({ text: Schema.String }),
  lines: Schema.Struct({ text: Schema.String }),
  line_number: NonNegativeInt,
  absolute_offset: NonNegativeInt,
  submatches: Schema.Array(
    Schema.Struct({
      match: Schema.Struct({ text: Schema.String }),
      start: NonNegativeInt,
      end: NonNegativeInt,
    }),
  ),
})

export const LegacyEntry = Schema.Struct({
  name: Schema.String,
  path: Schema.String,
  absolute: Schema.String,
  type: Schema.Literals(["file", "directory"]),
  ignored: Schema.Boolean,
}).annotate({ identifier: "FileNode" })

export const LegacyContent = Schema.Struct({
  type: Schema.Literals(["text", "binary"]),
  content: Schema.String,
  diff: Schema.optional(Schema.String),
  patch: Schema.optional(
    Schema.Struct({
      oldFileName: Schema.String,
      newFileName: Schema.String,
      oldHeader: Schema.optional(Schema.String),
      newHeader: Schema.optional(Schema.String),
      hunks: Schema.Array(
        Schema.Struct({
          oldStart: NonNegativeInt,
          oldLines: NonNegativeInt,
          newStart: NonNegativeInt,
          newLines: NonNegativeInt,
          lines: Schema.Array(Schema.String),
        }),
      ),
      index: Schema.optional(Schema.String),
    }),
  ),
  encoding: Schema.optional(Schema.Literal("base64")),
  mimeType: Schema.optional(Schema.String),
}).annotate({ identifier: "FileContent" })

export const LegacyStatus = Schema.Struct({
  path: Schema.String,
  added: NonNegativeInt,
  removed: NonNegativeInt,
  status: Schema.Literals(["added", "deleted", "modified"]),
}).annotate({ identifier: "File" })

export const FilePaths = {
  findText: "/find",
  findFile: "/find/file",
  findSymbol: "/find/symbol",
  list: "/file",
  content: "/file/content",
  status: "/file/status",
  write: "/file/write",
  create: "/file/create",
  delete: "/file/delete",
  rename: "/file/rename",
  stat: "/file/stat",
  replace: "/file/replace",
} as const

export const FileApi = HttpApi.make("file")
  .add(
    HttpApiGroup.make("file")
      .add(
        HttpApiEndpoint.get("findText", FilePaths.findText, {
          query: FindTextQuery,
          success: described(Schema.Array(LegacyMatch), "Matches"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "find.text",
            summary: "Find text",
            description: "Search for text patterns across files in the project using ripgrep.",
          }),
        ),
        HttpApiEndpoint.get("findFile", FilePaths.findFile, {
          query: FindFileQuery,
          success: described(Schema.Array(Schema.String), "File paths"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "find.files",
            summary: "Find files",
            description: "Search for files or directories by name or pattern in the project directory.",
          }),
        ),
        HttpApiEndpoint.get("findSymbol", FilePaths.findSymbol, {
          query: FindSymbolQuery,
          success: described(Schema.Array(LSP.Symbol), "Symbols"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "find.symbols",
            summary: "Find symbols",
            description: "Search for workspace symbols like functions, classes, and variables using LSP.",
          }),
        ),
        HttpApiEndpoint.get("list", FilePaths.list, {
          query: FileQuery,
          success: described(Schema.Array(LegacyEntry), "Files and directories"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "file.list",
            summary: "List files",
            description: "List files and directories in a specified path.",
          }),
        ),
        HttpApiEndpoint.get("content", FilePaths.content, {
          query: FileQuery,
          success: described(LegacyContent, "File content"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "file.read",
            summary: "Read file",
            description: "Read the content of a specified file.",
          }),
        ),
        HttpApiEndpoint.get("status", FilePaths.status, {
          query: WorkspaceRoutingQuery,
          success: described(Schema.Array(LegacyStatus), "File status"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "file.status",
            summary: "Get file status",
            description: "Get the git status of all files in the project.",
          }),
        ),
        HttpApiEndpoint.post("write", FilePaths.write, {
          payload: WriteFilePayload,
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Write success"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "file.write",
            summary: "Write file",
            description: "Write content to a specified file.",
          }),
        ),
        HttpApiEndpoint.post("create", FilePaths.create, {
          payload: CreateFilePayload,
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Create success"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "file.create",
            summary: "Create file or directory",
            description: "Create a new file or directory at the specified path.",
          }),
        ),
        HttpApiEndpoint.post("delete", FilePaths.delete, {
          payload: DeleteFilePayload,
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Delete success"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "file.delete",
            summary: "Delete file or directory",
            description: "Delete a file or directory at the specified path.",
          }),
        ),
        HttpApiEndpoint.post("rename", FilePaths.rename, {
          payload: RenameFilePayload,
          query: WorkspaceRoutingQuery,
          success: described(Schema.Boolean, "Rename success"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "file.rename",
            summary: "Rename file or directory",
            description: "Rename or move a file or directory to a new path.",
          }),
        ),
        HttpApiEndpoint.get("stat", FilePaths.stat, {
          query: FileQuery,
          success: described(FileStatResult, "File stat information"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "file.stat",
            summary: "Get file stat",
            description: "Get metadata and existence of a specified path.",
          }),
        ),
        HttpApiEndpoint.post("replace", FilePaths.replace, {
          payload: ReplaceFilePayload,
          query: WorkspaceRoutingQuery,
          success: described(ReplaceResult, "Replace operation result"),
        }).annotateMerge(
          OpenApi.annotations({
            identifier: "file.replace",
            summary: "Replace in files",
            description: "Search and replace text across files in the workspace.",
          }),
        ),
      )
      .annotateMerge(
        OpenApi.annotations({
          title: "file",
          description: "Experimental HttpApi file routes.",
        }),
      )
      .middleware(InstanceContextMiddleware)
      .middleware(WorkspaceRoutingMiddleware)
      .middleware(Authorization),
  )
  .annotateMerge(
    OpenApi.annotations({
      title: "opencode experimental HttpApi",
      version: "0.0.1",
      description: "Experimental HttpApi surface for selected instance routes.",
    }),
  )
