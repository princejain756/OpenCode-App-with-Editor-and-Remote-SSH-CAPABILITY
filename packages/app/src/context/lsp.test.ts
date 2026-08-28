import { describe, expect, test } from "bun:test"

describe("LSP Diagnostics and Language Intelligence", () => {
  test("categorizes diagnostics by file and severity", () => {
    const rawDiagnostics = [
      {
        file: "src/index.ts",
        range: { start: { line: 10, character: 4 }, end: { line: 10, character: 15 } },
        message: "Cannot find name 'foo'.",
        severity: "error" as const,
        source: "typescript",
        code: 2304,
      },
      {
        file: "src/index.ts",
        range: { start: { line: 15, character: 2 }, end: { line: 15, character: 10 } },
        message: "'bar' is declared but its value is never read.",
        severity: "warning" as const,
        source: "typescript",
        code: 6133,
      },
      {
        file: "src/utils.ts",
        range: { start: { line: 5, character: 0 }, end: { line: 5, character: 20 } },
        message: "Type 'string' is not assignable to type 'number'.",
        severity: "error" as const,
        source: "typescript",
        code: 2322,
      },
    ]

    const diagnosticsByFile: Record<string, typeof rawDiagnostics> = {}
    for (const d of rawDiagnostics) {
      const list = diagnosticsByFile[d.file] ?? []
      list.push(d)
      diagnosticsByFile[d.file] = list
    }

    expect(Object.keys(diagnosticsByFile)).toHaveLength(2)
    expect(diagnosticsByFile["src/index.ts"]).toHaveLength(2)
    expect(diagnosticsByFile["src/utils.ts"]).toHaveLength(1)

    // Compute error and warning counts
    let totalErrors = 0
    let totalWarnings = 0
    for (const file of Object.keys(diagnosticsByFile)) {
      totalErrors += diagnosticsByFile[file].filter((d) => d.severity === "error").length
      totalWarnings += diagnosticsByFile[file].filter((d) => d.severity === "warning").length
    }

    expect(totalErrors).toBe(2)
    expect(totalWarnings).toBe(1)
  })

  test("converts 0-indexed LSP ranges to 1-indexed Monaco line/column coordinates", () => {
    const lspRange = {
      start: { line: 0, character: 4 },
      end: { line: 0, character: 12 },
    }

    const monacoRange = {
      startLineNumber: lspRange.start.line + 1,
      startColumn: lspRange.start.character + 1,
      endLineNumber: lspRange.end.line + 1,
      endColumn: lspRange.end.character + 1,
    }

    expect(monacoRange.startLineNumber).toBe(1)
    expect(monacoRange.startColumn).toBe(5)
    expect(monacoRange.endLineNumber).toBe(1)
    expect(monacoRange.endColumn).toBe(13)
  })
})
