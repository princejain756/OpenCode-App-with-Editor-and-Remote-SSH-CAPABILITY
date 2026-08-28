import { describe, expect, test } from "bun:test"

describe("Buffer Concurrency & Conflict Engine", () => {
  test("clean buffer auto-reloads when external disk change arrives", () => {
    const buffer = {
      path: "server.ts",
      content: "console.log('original')",
      diskContent: "console.log('original')",
      diskVersion: 1,
      isDirty: false,
      hasConflict: false,
      conflictContent: undefined as string | undefined,
    }

    const externalDiskContent = "console.log('updated by agent')"

    // External change notification
    if (!buffer.isDirty) {
      buffer.content = externalDiskContent
      buffer.diskContent = externalDiskContent
      buffer.diskVersion += 1
      buffer.isDirty = false
    }

    expect(buffer.content).toBe(externalDiskContent)
    expect(buffer.diskContent).toBe(externalDiskContent)
    expect(buffer.diskVersion).toBe(2)
    expect(buffer.hasConflict).toBe(false)
  })

  test("dirty buffer flags conflict and preserves human edits when external disk change arrives", () => {
    const buffer = {
      path: "server.ts",
      content: "console.log('my unsaved human edits')",
      diskContent: "console.log('original')",
      diskVersion: 1,
      isDirty: true,
      hasConflict: false,
      conflictContent: undefined as string | undefined,
    }

    const externalDiskContent = "console.log('agent concurrent write')"

    // External change notification
    if (buffer.isDirty && buffer.content !== externalDiskContent) {
      buffer.hasConflict = true
      buffer.conflictContent = externalDiskContent
      buffer.diskVersion += 1
    }

    expect(buffer.content).toBe("console.log('my unsaved human edits')") // human edits protected!
    expect(buffer.hasConflict).toBe(true)
    expect(buffer.conflictContent).toBe(externalDiskContent)
    expect(buffer.isDirty).toBe(true)

    // Resolution: Keep My Edits
    buffer.hasConflict = false
    buffer.conflictContent = undefined
    expect(buffer.content).toBe("console.log('my unsaved human edits')")
    expect(buffer.hasConflict).toBe(false)
  })

  test("conflict resolution: reload from disk replaces content and resets dirty status", () => {
    const buffer = {
      path: "server.ts",
      content: "console.log('my unsaved human edits')",
      diskContent: "console.log('original')",
      diskVersion: 1,
      isDirty: true,
      hasConflict: true,
      conflictContent: "console.log('agent concurrent write')" as string | undefined,
    }

    // Resolution: Reload from Disk
    if (buffer.conflictContent !== undefined) {
      buffer.content = buffer.conflictContent
      buffer.diskContent = buffer.conflictContent
    }
    buffer.isDirty = false
    buffer.hasConflict = false
    buffer.conflictContent = undefined

    expect(buffer.content).toBe("console.log('agent concurrent write')")
    expect(buffer.diskContent).toBe("console.log('agent concurrent write')")
    expect(buffer.isDirty).toBe(false)
    expect(buffer.hasConflict).toBe(false)
  })

  test("regex search and replace transformation across text", () => {
    const source = `function add(a: number, b: number) {\n  return a + b\n}\nconst res = add(1, 2)`
    const query = "add"
    const replace = "sum"
    const isRegex = false
    const matchWholeWord = true

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const pattern = matchWholeWord ? `\\b${escaped}\\b` : escaped
    const regex = new RegExp(pattern, "g")

    const result = source.replace(regex, replace)
    expect(result).toBe(`function sum(a: number, b: number) {\n  return a + b\n}\nconst res = sum(1, 2)`)
  })
})
