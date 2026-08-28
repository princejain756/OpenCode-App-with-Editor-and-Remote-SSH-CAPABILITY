export interface EditorBuffer {
  path: string
  name: string
  content: string
  diskContent: string
  diskVersion: number
  bufferVersion: number
  isDirty: boolean
  isLoading: boolean
  isSaving: boolean
  hasConflict: boolean
  conflictContent?: string
  language: string
  error?: string
  lastModified?: number
  cursor?: { line: number; column: number }
  scrollTop?: number
  scrollLeft?: number
}

export interface BufferCloseResult {
  closed: boolean
  wasDirty?: boolean
  path: string
}

export type ConflictResolution = "keep" | "reload" | "compare"

export interface EditorSettings {
  fontSize: number
  tabSize: number
  wordWrap: "on" | "off" | "wordWrapColumn" | "bounded"
  minimap: boolean
  lineNumbers: "on" | "off" | "relative"
  folding: boolean
  bracketPairColorization: boolean
  renderWhitespace: "none" | "boundary" | "selection" | "trailing" | "all"
  fontFamily: string
  cursorBlinking: "blink" | "smooth" | "phase" | "expand" | "solid"
  smoothScrolling: boolean
  formatOnSave: boolean
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 13,
  tabSize: 2,
  wordWrap: "on",
  minimap: true,
  lineNumbers: "on",
  folding: true,
  bracketPairColorization: true,
  renderWhitespace: "selection",
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Courier New', monospace",
  cursorBlinking: "smooth",
  smoothScrolling: true,
  formatOnSave: false,
}

export function detectLanguage(filepath: string): string {
  const lower = filepath.toLowerCase()
  const base = lower.split("/").pop() ?? ""
  
  if (base === "dockerfile" || base.startsWith("dockerfile.")) return "dockerfile"
  if (base === "makefile" || base === "gnumakefile") return "makefile"
  if (base === ".gitignore" || base === ".ignore" || base === ".dockerignore") return "ignore"
  if (base === "package.json" || base === "tsconfig.json" || base.endsWith(".json")) return "json"
  
  const ext = lower.includes(".") ? lower.split(".").pop()! : ""
  switch (ext) {
    case "ts":
      return "typescript"
    case "tsx":
      return "typescript"
    case "js":
    case "mjs":
    case "cjs":
      return "javascript"
    case "jsx":
      return "javascript"
    case "json":
    case "jsonc":
    case "json5":
      return "json"
    case "py":
    case "pyi":
      return "python"
    case "rs":
      return "rust"
    case "go":
      return "go"
    case "c":
    case "h":
      return "c"
    case "cpp":
    case "hpp":
    case "cc":
    case "cxx":
      return "cpp"
    case "css":
      return "css"
    case "scss":
    case "sass":
      return "scss"
    case "less":
      return "less"
    case "html":
    case "htm":
      return "html"
    case "md":
    case "markdown":
    case "mdx":
      return "markdown"
    case "yaml":
    case "yml":
      return "yaml"
    case "toml":
      return "toml"
    case "sh":
    case "bash":
    case "zsh":
      return "shell"
    case "sql":
      return "sql"
    case "xml":
    case "svg":
      return "xml"
    case "java":
      return "java"
    case "kt":
    case "kts":
      return "kotlin"
    case "php":
      return "php"
    case "rb":
      return "ruby"
    case "swift":
      return "swift"
    case "lua":
      return "lua"
    case "zig":
      return "zig"
    case "diff":
    case "patch":
      return "diff"
    case "graphql":
    case "gql":
      return "graphql"
    default:
      return "plaintext"
  }
}
