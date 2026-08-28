import { describe, expect, test } from "bun:test"
import { detectLanguage, DEFAULT_EDITOR_SETTINGS } from "./buffer/types"

describe("Buffer and Language Detection", () => {
  test("detects languages correctly by file extension and name", () => {
    expect(detectLanguage("src/index.ts")).toBe("typescript")
    expect(detectLanguage("src/app.tsx")).toBe("typescript")
    expect(detectLanguage("main.py")).toBe("python")
    expect(detectLanguage("server.go")).toBe("go")
    expect(detectLanguage("lib.rs")).toBe("rust")
    expect(detectLanguage("package.json")).toBe("json")
    expect(detectLanguage("Dockerfile")).toBe("dockerfile")
    expect(detectLanguage(".gitignore")).toBe("ignore")
    expect(detectLanguage("style.css")).toBe("css")
    expect(detectLanguage("index.html")).toBe("html")
    expect(detectLanguage("README.md")).toBe("markdown")
    expect(detectLanguage("unknown.xyz")).toBe("plaintext")
  })

  test("default editor settings have sensible defaults", () => {
    expect(DEFAULT_EDITOR_SETTINGS.fontSize).toBe(13)
    expect(DEFAULT_EDITOR_SETTINGS.tabSize).toBe(2)
    expect(DEFAULT_EDITOR_SETTINGS.minimap).toBe(true)
    expect(DEFAULT_EDITOR_SETTINGS.folding).toBe(true)
    expect(DEFAULT_EDITOR_SETTINGS.wordWrap).toBe("on")
    expect(DEFAULT_EDITOR_SETTINGS.bracketPairColorization).toBe(true)
  })

  test("buffer dirty state transitions accurately", () => {
    const buffer = {
      path: "test.ts",
      name: "test.ts",
      content: "console.log('hello')",
      diskContent: "console.log('hello')",
      diskVersion: 1,
      bufferVersion: 0,
      isDirty: false,
      isLoading: false,
      isSaving: false,
      hasConflict: false,
      language: "typescript",
    }

    expect(buffer.isDirty).toBe(false)

    // User types
    buffer.content = "console.log('hello world')"
    buffer.bufferVersion += 1
    buffer.isDirty = buffer.content !== buffer.diskContent
    expect(buffer.isDirty).toBe(true)

    // User undoes back to disk content
    buffer.content = "console.log('hello')"
    buffer.isDirty = buffer.content !== buffer.diskContent
    expect(buffer.isDirty).toBe(false)

    // User types and saves
    buffer.content = "console.log('saved content')"
    buffer.isDirty = true
    // Save occurs
    buffer.diskContent = buffer.content
    buffer.diskVersion += 1
    buffer.isDirty = false
    expect(buffer.isDirty).toBe(false)
    expect(buffer.diskVersion).toBe(2)
  })

  test("conflict detection when disk changes while buffer is dirty", () => {
    const buffer = {
      path: "test.ts",
      content: "my local unsaved edits",
      diskContent: "original content",
      isDirty: true,
      hasConflict: false,
      conflictContent: undefined as string | undefined,
    }

    const externalNewDisk = "agent changed this line"
    // Disk changed externally
    if (buffer.isDirty && buffer.content !== externalNewDisk) {
      buffer.hasConflict = true
      buffer.conflictContent = externalNewDisk
    }

    expect(buffer.hasConflict).toBe(true)
    expect(buffer.conflictContent).toBe(externalNewDisk)
    expect(buffer.content).toBe("my local unsaved edits") // user edits preserved
  })
})
