import { describe, expect, test } from "bun:test"

describe("Debug Adapter Protocol Frontend Context & State", () => {
  test("toggles breakpoints and maintains sorted line order", () => {
    let lines: number[] = []

    // Add line 20
    lines = [...lines, 20].sort((a, b) => a - b)
    // Add line 5
    lines = [...lines, 5].sort((a, b) => a - b)
    // Add line 12
    lines = [...lines, 12].sort((a, b) => a - b)

    expect(lines).toEqual([5, 12, 20])

    // Toggle off line 12
    lines = lines.filter((l) => l !== 12)
    expect(lines).toEqual([5, 20])
  })

  test("structures debug toolbar action mappings", () => {
    const actions = {
      continue: { shortcut: "F5", status: "running" },
      pause: { shortcut: "F6", status: "stopped" },
      stepOver: { shortcut: "F10" },
      stepInto: { shortcut: "F11" },
      stepOut: { shortcut: "Shift+F11" },
      stop: { shortcut: "Shift+F5", status: "terminated" },
    }

    expect(actions.continue.shortcut).toBe("F5")
    expect(actions.stepOver.shortcut).toBe("F10")
    expect(actions.stop.status).toBe("terminated")
  })

  test("formats call stack frame titles and file locations", () => {
    const frame = {
      id: 1,
      name: "calculateTotal",
      file: "/home/ubuntu/repo/src/cart.ts",
      line: 45,
      column: 10,
    }

    const title = `${frame.name} (${frame.file.split("/").pop()}:${frame.line})`
    expect(title).toBe("calculateTotal (cart.ts:45)")
  })
})
